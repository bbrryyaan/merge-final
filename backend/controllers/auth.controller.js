import bcrypt from "bcryptjs";
import User from "../models/user.js";
import {
  REFRESH_COOKIE_NAME,
  clearAuthCookies,
  setAuthCookies,
  signAccessToken,
  signRefreshToken,
  verifyJwt,
} from "../lib/auth.js";

const MIN_PASSWORD_LENGTH = 8;

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  monthlyBudget: user.monthlyBudget,
  netBalance: user.netBalance,
  cashBalance: user.cashBalance,
  savingsBalance: user.savingsBalance,
  currency: user.currency,
});

const createAndPersistSession = async (res, userId) => {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

  await User.findByIdAndUpdate(userId, { refreshTokenHash });
  setAuthCookies({ res, accessToken, refreshToken });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, monthlyBudget, netBalance, currency } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name?.trim() || !normalizedEmail || !password || monthlyBudget === undefined) {
      return res.status(400).json({ message: "Name, email, password and monthly budget are required" });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const parsedBudget = Number(monthlyBudget);
    
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      return res.status(400).json({ message: "Monthly budget must be a positive number" });
    }

    const normalizedCurrency = String(currency || "INR").trim().toUpperCase();
    if (!normalizedCurrency || normalizedCurrency.length > 5) {
      return res.status(400).json({ message: "Currency is invalid" });
    }

    let parsedNetBalance = null;
    if (netBalance !== undefined && netBalance !== null) {
      parsedNetBalance = Number(netBalance);
      if (!Number.isFinite(parsedNetBalance) || parsedNetBalance < 0) {
         return res.status(400).json({ message: "Net balance cannot be negative" });
      }
    }

    let parsedCashBalance = null;
    if (req.body.cashBalance !== undefined && req.body.cashBalance !== null) {
      parsedCashBalance = Number(req.body.cashBalance);
      if (!Number.isFinite(parsedCashBalance) || parsedCashBalance < 0) {
         return res.status(400).json({ message: "Cash balance cannot be negative" });
      }
    }

    let parsedSavings = null;
    if (req.body.savingsBalance !== undefined && req.body.savingsBalance !== null) {
      parsedSavings = Number(req.body.savingsBalance);
      if (!Number.isFinite(parsedSavings) || parsedSavings < 0) {
         return res.status(400).json({ message: "Savings balance cannot be negative" });
      }
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      monthlyBudget: parsedBudget,
      netBalance: parsedNetBalance,
      cashBalance: parsedCashBalance,
      savingsBalance: parsedSavings,
      currency: normalizedCurrency,
    });

    res.status(201).json({ message: "Account created successfully", user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
};

export const updateNetBalance = async (req, res) => {
  try {
    const { netBalance, cashBalance, savingsBalance } = req.body;

    const parsedNet = Number(netBalance);
    const parsedCash = Number(cashBalance);
    const parsedSavings = Number(savingsBalance);

    if (!Number.isFinite(parsedNet) || parsedNet < 0 || 
        !Number.isFinite(parsedCash) || parsedCash < 0 ||
        !Number.isFinite(parsedSavings) || parsedSavings < 0) {
      return res.status(400).json({ message: "Balances must be valid non-negative numbers" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { netBalance: parsedNet, cashBalance: parsedCash, savingsBalance: parsedSavings },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Balances updated",
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update balances" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await createAndPersistSession(res, user._id);

    res.status(200).json({ message: "Login successful", user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
};

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if ((user.netBalance === undefined || user.netBalance === null) &&
        (user.cashBalance === undefined || user.cashBalance === null) &&
        (user.savingsBalance === undefined || user.savingsBalance === null)) {
      return res.status(206).json({ message: "Balances not set", user: sanitizeUser(user) });
    }

    res.status(200).json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

export const updateBudget = async (req, res) => {
  try {
    const { monthlyBudget, currency } = req.body;
    const updates = {};

    if (monthlyBudget !== undefined) {
      const parsedBudget = Number(monthlyBudget);
      if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
        return res.status(400).json({ message: "Monthly budget must be greater than zero" });
      }

      updates.monthlyBudget = parsedBudget;
    }

    if (currency !== undefined) {
      const normalizedCurrency = String(currency).trim().toUpperCase();
      if (!normalizedCurrency || normalizedCurrency.length > 5) {
        return res.status(400).json({ message: "Currency is invalid" });
      }

      updates.currency = normalizedCurrency;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid profile fields provided" });
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Profile updated", user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile" });
  }
};

export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    const decoded = verifyJwt(refreshToken);
    if (decoded.tokenType !== "refresh") {
      clearAuthCookies(res);
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.id).select("+refreshTokenHash");
    if (!user || !user.refreshTokenHash) {
      clearAuthCookies(res);
      return res.status(401).json({ message: "Invalid session" });
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isMatch) {
      clearAuthCookies(res);
      return res.status(401).json({ message: "Session expired" });
    }

    await createAndPersistSession(res, user._id);

    res.status(200).json({ message: "Session refreshed", user: sanitizeUser(user) });
  } catch (error) {
    clearAuthCookies(res);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      try {
        const decoded = verifyJwt(refreshToken);
        await User.findByIdAndUpdate(decoded.id, { refreshTokenHash: null });
      } catch (error) {
        // Best effort cleanup only.
      }
    } else if (req.user?.id) {
      await User.findByIdAndUpdate(req.user.id, { refreshTokenHash: null });
    }

    clearAuthCookies(res);
    res.status(200).json({ message: "Logged out" });
  } catch (error) {
    clearAuthCookies(res);
    res.status(200).json({ message: "Logged out" });
  }
};
