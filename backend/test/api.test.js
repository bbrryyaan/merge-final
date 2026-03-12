import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const clone = (value) =>
  value === null || value === undefined ? value : JSON.parse(JSON.stringify(value));

const store = {
  users: [],
  expenses: [],
  goals: [],
  userCounter: 1,
  expenseCounter: 1,
  goalCounter: 1,
};

const nextUserId = () => `user-${store.userCounter++}`;
const nextExpenseId = () => `expense-${store.expenseCounter++}`;
const nextGoalId = () => `goal-${store.goalCounter++}`;

const sanitizeUser = (user, include = "") => {
  if (!user) {
    return null;
  }

  const sanitized = {
    _id: user._id,
    name: user.name,
    email: user.email,
    monthlyBudget: user.monthlyBudget,
    currency: user.currency,
  };

  if (include.includes("+password")) {
    sanitized.password = user.password;
  }

  if (include.includes("+refreshTokenHash")) {
    sanitized.refreshTokenHash = user.refreshTokenHash;
  }

  return clone(sanitized);
};

const buildUserQuery = (user) => ({
  select: async (fields) => sanitizeUser(user, fields),
  then: (resolve, reject) => Promise.resolve(sanitizeUser(user)).then(resolve, reject),
  catch: (reject) => Promise.resolve(sanitizeUser(user)).catch(reject),
});

const buildExpenseQuery = (items) => ({
  sort: async (sortBy) => {
    const cloned = clone(items);

    if (sortBy?.createdAt === -1) {
      return cloned.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return cloned;
  },
  then: (resolve, reject) => Promise.resolve(clone(items)).then(resolve, reject),
  catch: (reject) => Promise.resolve(clone(items)).catch(reject),
});

const toGoalDoc = (goal) => ({
  ...goal,
  save: async function save() {
    const index = store.goals.findIndex((item) => item._id === goal._id);
    if (index >= 0) {
      const updated = {
        ...store.goals[index],
        title: this.title,
        targetAmount: this.targetAmount,
        savedAmount: this.savedAmount,
        targetDate: this.targetDate,
        note: this.note,
        isArchived: this.isArchived,
      };
      store.goals[index] = updated;
      Object.assign(goal, updated);
    }
    return toGoalDoc(store.goals[index]);
  },
  toObject: function toObject() {
    return clone({
      ...goal,
      title: this.title,
      targetAmount: this.targetAmount,
      savedAmount: this.savedAmount,
      targetDate: this.targetDate,
      note: this.note,
      isArchived: this.isArchived,
    });
  },
});

const buildGoalQuery = (items) => ({
  sort: async (sortBy) => {
    const cloned = clone(items);

    if (sortBy?.createdAt === -1) {
      return cloned.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return cloned;
  },
  then: (resolve, reject) => Promise.resolve(clone(items)).then(resolve, reject),
  catch: (reject) => Promise.resolve(clone(items)).catch(reject),
});

vi.mock("../models/user.js", () => ({
  default: {
    findOne: (filter) => {
      const user = store.users.find((item) => item.email === filter.email) || null;
      return buildUserQuery(user);
    },
    create: async (payload) => {
      const user = {
        _id: nextUserId(),
        name: payload.name,
        email: payload.email,
        password: payload.password,
        refreshTokenHash: null,
        monthlyBudget: payload.monthlyBudget ?? 5000,
        currency: payload.currency ?? "INR",
      };

      store.users.push(user);
      return sanitizeUser(user);
    },
    findById: (id) => {
      const user = store.users.find((item) => item._id === id) || null;
      return buildUserQuery(user);
    },
    findByIdAndUpdate: async (id, updates) => {
      const user = store.users.find((item) => item._id === id);
      if (!user) {
        return null;
      }

      Object.assign(user, updates);
      return sanitizeUser(user);
    },
  },
}));

vi.mock("../models/expense.js", () => ({
  default: {
    find: (filter) => {
      const items = store.expenses.filter((expense) => expense.userId === filter.userId);
      return buildExpenseQuery(items);
    },
    create: async (payload) => {
      const timestamp = new Date(Date.now() + store.expenseCounter * 1000).toISOString();
      const expense = {
        _id: nextExpenseId(),
        userId: payload.userId,
        description: payload.description,
        amount: payload.amount,
        type: payload.type ?? "expense",
        entryMode: payload.entryMode ?? "actual",
        category: payload.category ?? "Other",
        transactionDate: payload.transactionDate ?? timestamp,
        isEssential: payload.isEssential ?? false,
        note: payload.note ?? "",
        isSample: payload.isSample ?? false,
        sdgImpact: payload.sdgImpact ?? { score: 5, description: "SDG 12 Compliance" },
        nudge: payload.nudge ?? "",
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      store.expenses.push(expense);
      return clone(expense);
    },
    insertMany: async (items) => {
      const created = items.map((item) => {
        const timestamp = new Date(Date.now() + store.expenseCounter * 1000).toISOString();
        const expense = {
          _id: nextExpenseId(),
          userId: item.userId,
          description: item.description,
          amount: item.amount,
          type: item.type ?? "expense",
          entryMode: item.entryMode ?? "actual",
          category: item.category ?? "Other",
          transactionDate: item.transactionDate ?? timestamp,
          isEssential: item.isEssential ?? false,
          note: item.note ?? "",
          isSample: item.isSample ?? false,
          sdgImpact: item.sdgImpact ?? { score: 5, description: "SDG 12 Compliance" },
          nudge: item.nudge ?? "",
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        store.expenses.push(expense);
        return clone(expense);
      });

      return created;
    },
  },
}));

vi.mock("../models/goal.js", () => ({
  default: {
    find: (filter) => {
      const items = store.goals.filter((goal) => {
        if (goal.userId !== filter.userId) return false;
        if (filter.isArchived !== undefined && goal.isArchived !== filter.isArchived) return false;
        return true;
      });
      return buildGoalQuery(items);
    },
    create: async (payload) => {
      const timestamp = new Date(Date.now() + store.goalCounter * 1000).toISOString();
      const goal = {
        _id: nextGoalId(),
        userId: payload.userId,
        title: payload.title,
        targetAmount: payload.targetAmount,
        savedAmount: payload.savedAmount ?? 0,
        targetDate: payload.targetDate ?? null,
        note: payload.note ?? "",
        isArchived: payload.isArchived ?? false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      store.goals.push(goal);
      return toGoalDoc(goal);
    },
    findOne: async (filter) => {
      const goal =
        store.goals.find((item) => {
          if (filter._id !== undefined && item._id !== filter._id) return false;
          if (filter.userId !== undefined && item.userId !== filter.userId) return false;
          if (filter.isArchived !== undefined && item.isArchived !== filter.isArchived) return false;
          return true;
        }) || null;

      return goal ? toGoalDoc(goal) : null;
    },
    findOneAndUpdate: async (filter, updates) => {
      const goal = store.goals.find((item) => {
        if (filter._id !== undefined && item._id !== filter._id) return false;
        if (filter.userId !== undefined && item.userId !== filter.userId) return false;
        if (filter.isArchived !== undefined && item.isArchived !== filter.isArchived) return false;
        return true;
      });

      if (!goal) {
        return null;
      }

      Object.assign(goal, updates);
      goal.updatedAt = new Date().toISOString();
      return toGoalDoc(goal);
    },
  },
}));

let app;

const extractCookie = (cookies, cookieName) => {
  const cookie = cookies.find((entry) => entry.startsWith(`${cookieName}=`));
  if (!cookie) {
    return null;
  }

  const rawPair = cookie.split(";")[0];
  return rawPair.slice(cookieName.length + 1);
};

beforeAll(async () => {
  app = (await import("../src/app.js")).default;
});

beforeEach(() => {
  process.env.JWT_SECRET = "test-jwt-secret";
  process.env.CLIENT_ORIGIN = "http://localhost:5173";

  store.users = [];
  store.expenses = [];
  store.goals = [];
  store.userCounter = 1;
  store.expenseCounter = 1;
  store.goalCounter = 1;
});

describe("Secure auth flow", () => {
  it("registers, logs in, and reads profile through secure cookies", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
      monthlyBudget: 12000,
    });

    const loginResponse = await agent.post("/api/auth/login").send({
      email: "alice@example.com",
      password: "password123",
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user.email).toBe("alice@example.com");

    const setCookieHeaders = loginResponse.headers["set-cookie"] || [];
    expect(setCookieHeaders.join(";")).toContain("access_token=");
    expect(setCookieHeaders.join(";")).toContain("refresh_token=");
    expect(setCookieHeaders.join(";")).toContain("HttpOnly");

    const meResponse = await agent.get("/api/auth/me");
    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user.name).toBe("Alice");
  });

  it("rotates refresh tokens and updates the stored token hash", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send({
      name: "Bob",
      email: "bob@example.com",
      password: "password123",
    });

    const loginResponse = await agent.post("/api/auth/login").send({
      email: "bob@example.com",
      password: "password123",
    });

    const originalCookies = loginResponse.headers["set-cookie"] || [];
    const oldRefreshToken = extractCookie(originalCookies, "refresh_token");
    expect(oldRefreshToken).toBeTruthy();

    const refreshResponse = await agent.post("/api/auth/refresh");
    expect(refreshResponse.status).toBe(200);
    const newRefreshToken = extractCookie(refreshResponse.headers["set-cookie"] || [], "refresh_token");
    expect(newRefreshToken).toBeTruthy();
    expect(newRefreshToken).not.toBe(oldRefreshToken);

    const storedUser = store.users.find((item) => item.email === "bob@example.com");
    const newTokenMatchesStoredHash = await bcrypt.compare(
      newRefreshToken,
      storedUser.refreshTokenHash,
    );
    expect(newTokenMatchesStoredHash).toBe(true);
  });

  it("clears session on logout", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send({
      name: "Cara",
      email: "cara@example.com",
      password: "password123",
    });

    await agent.post("/api/auth/login").send({
      email: "cara@example.com",
      password: "password123",
    });

    const logoutResponse = await agent.post("/api/auth/logout");
    expect(logoutResponse.status).toBe(200);

    const meAfterLogout = await agent.get("/api/auth/me");
    expect(meAfterLogout.status).toBe(401);
  });

  it("stores refresh tokens hashed in the user record", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send({
      name: "Diana",
      email: "diana@example.com",
      password: "password123",
    });

    const loginResponse = await agent.post("/api/auth/login").send({
      email: "diana@example.com",
      password: "password123",
    });

    const refreshToken = extractCookie(loginResponse.headers["set-cookie"] || [], "refresh_token");
    const storedUser = store.users.find((item) => item.email === "diana@example.com");

    expect(refreshToken).toBeTruthy();
    expect(storedUser.refreshTokenHash).toBeTruthy();

    const hashMatches = await bcrypt.compare(refreshToken, storedUser.refreshTokenHash);
    expect(hashMatches).toBe(true);
  });
});

describe("Protected expense APIs", () => {
  it("blocks unauthenticated expense access", async () => {
    const response = await request(app).get("/api/expenses/history");
    expect(response.status).toBe(401);
  });

  it("creates expenses, seeds data, and returns stats", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send({
      name: "Evan",
      email: "evan@example.com",
      password: "password123",
      monthlyBudget: 10000,
    });

    await agent.post("/api/auth/login").send({
      email: "evan@example.com",
      password: "password123",
    });

    const addExpenseResponse = await agent.post("/api/expenses/add").send({
      description: "City bus pass",
      amount: 600,
    });

    expect(addExpenseResponse.status).toBe(201);
    expect(addExpenseResponse.body.amount).toBe(600);

    const seedResponse = await agent.post("/api/expenses/seed");
    expect(seedResponse.status).toBe(200);

    const historyResponse = await agent.get("/api/expenses/history");
    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.length).toBeGreaterThan(1);

    const statsResponse = await agent.get("/api/expenses/stats");
    expect(statsResponse.status).toBe(200);
    expect(statsResponse.body.totalSpent).toBeGreaterThan(0);
    expect(statsResponse.body.averageTransactionValue).toBeGreaterThan(0);
  });
});

describe("Affordability and goal APIs", () => {
  it("creates goals, adds contribution, and returns affordability insight", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send({
      name: "Farah",
      email: "farah@example.com",
      password: "password123",
      monthlyBudget: 25000,
    });

    await agent.post("/api/auth/login").send({
      email: "farah@example.com",
      password: "password123",
    });

    await agent.post("/api/transactions").send({
      description: "Salary credit",
      amount: 60000,
      type: "income",
      category: "Salary",
      transactionDate: new Date().toISOString(),
      entryMode: "actual",
    });

    await agent.post("/api/transactions").send({
      description: "Rent",
      amount: 17000,
      type: "expense",
      category: "Rent",
      transactionDate: new Date().toISOString(),
      entryMode: "actual",
    });

    const createGoalResponse = await agent.post("/api/goals").send({
      title: "New Laptop",
      targetAmount: 120000,
      savedAmount: 10000,
    });
    expect(createGoalResponse.status).toBe(201);
    const goalId = createGoalResponse.body._id;
    expect(goalId).toBeTruthy();

    const contributeResponse = await agent.post(`/api/goals/${goalId}/contribute`).send({
      amount: 5000,
    });
    expect(contributeResponse.status).toBe(200);
    expect(contributeResponse.body.goal.savedAmount).toBe(15000);

    const goalsResponse = await agent.get("/api/goals");
    expect(goalsResponse.status).toBe(200);
    expect(goalsResponse.body.length).toBe(1);
    expect(goalsResponse.body[0].remainingAmount).toBeGreaterThan(0);

    const affordResponse = await agent.post("/api/transactions/ai-afford").send({
      itemName: "Gaming Phone",
      amount: 45000,
      goalId,
    });

    expect(affordResponse.status).toBe(200);
    expect(typeof affordResponse.body.decision.canAfford).toBe("boolean");
    expect(affordResponse.body.goals.active.length).toBe(1);
    expect(affordResponse.body.context.spendableNow).toBeGreaterThanOrEqual(0);
  });
});
