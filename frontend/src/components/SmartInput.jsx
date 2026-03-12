import { useEffect, useMemo, useState, useRef } from "react";
import { Loader2, Sparkles, Wand2, Camera, Upload, X } from "lucide-react";
import api from "../lib/api";

const categoryMap = {
  expense: ["Food", "Transport", "Rent", "Utilities", "Shopping", "Health", "Entertainment", "Education", "Bills", "Groceries", "Savings", "Other"],
  income: ["Salary", "Freelance", "Investments", "Refund", "Gift", "Other"],
};

const getToday = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const SmartInput = ({ onTransactionAdded }) => {
  const [type, setType] = useState("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categoryMap.expense[0]);
  const [transactionDate, setTransactionDate] = useState(getToday());
  const [note, setNote] = useState("");
  const [useAi, setUseAi] = useState(true);
  const [isEssential, setIsEssential] = useState(true);

  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const [scanning, setScanning] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeStream, setActiveStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setCategory(categoryMap[type][0]);
    setIsEssential(type === "expense");
  }, [type]);

  // Handle stream binding when modal opens
  useEffect(() => {
    if (isCameraOpen && activeStream && videoRef.current) {
      videoRef.current.srcObject = activeStream;
      videoRef.current.play().catch(err => console.error("Camera play error:", err));
    }
  }, [isCameraOpen, activeStream]);

  const categoryOptions = useMemo(() => categoryMap[type], [type]);

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setCategory(categoryMap[type][0]);
    setNote("");
    setAiSuggestion(null);
  };

  const handleAiSuggest = async () => {
    setErrorMessage("");
    const parsedAmount = Number(amount);
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Add description and amount before AI suggest.");
      return;
    }

    try {
      setAiLoading(true);
      const { data } = await api.post("/api/transactions/ai-suggest", {
        description,
        amount: parsedAmount,
        transactionDate,
        type,
      });

      setAiSuggestion(data);
      setType(data.type === "income" ? "income" : "expense");
      setCategory(data.category || "Other");
      setNote(data.note || "");
      setIsEssential(Boolean(data.isEssential));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "AI suggestion failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      setActiveStream(stream);
      setIsCameraOpen(true);
      setErrorMessage("");
    } catch (error) {
      console.error(error);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
      setActiveStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    // Capture absolute raw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Apply Preprocessing: Grayscale + High Contrast
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const contrast = 1.6; // High contrast factor
      const intercept = 120 * (1 - contrast);

      for (let i = 0; i < data.length; i += 4) {
        // Grayscale conversion (weighted)
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const val = gray * contrast + intercept;
        // Clamp 0-255
        const final = Math.min(255, Math.max(0, val));
        data[i] = data[i + 1] = data[i + 2] = final;
      }
      ctx.putImageData(imageData, 0, 0);
    } catch (e) {
      console.warn("Preprocessing failed, using raw image", e);
    }

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopCamera();

      const file = new File([blob], "receipt_capture.jpg", { type: "image/jpeg" });
      await processImageForOcr(file);
    }, "image/jpeg", 0.95);
  };

  const processImageForOcr = async (file) => {
    try {
      setScanning(true);
      setErrorMessage("");

      const formData = new FormData();
      formData.append("image", file);

      const { data } = await api.post("/api/ocr/scan", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const analysis = data.aiAnalysis;
      let filledAny = false;

      if (analysis) {
        if (analysis.merchant && analysis.merchant.trim() !== "") {
          setDescription(analysis.merchant);
          filledAny = true;
        }
        if (analysis.amount != null && analysis.amount !== "") {
          setAmount(String(analysis.amount));
          filledAny = true;
        }
        if (analysis.category) {
          const matchedType = (analysis.type === "income" || (analysis.category && analysis.category.toLowerCase() === "income")) ? "income" : "expense";
          setType(matchedType);
          
          // Try to match the category string exactly or fallback to Other
          const lowerCat = analysis.category.toLowerCase();
          const targetCategory = categoryMap[matchedType].find(c => c.toLowerCase() === lowerCat) || "Other";
          setCategory(targetCategory);

          // Auto-set essential for things like Bills or Groceries
          if (matchedType === "expense") {
            const essentialCats = ["bills", "groceries", "utilities", "rent", "health"];
            setIsEssential(essentialCats.includes(lowerCat));
          }
        }
        if (analysis.payment_method && type !== "income") {
          setNote(prev => prev ? `${prev} (via ${analysis.payment_method})` : `Paid via ${analysis.payment_method}`);
        }
        if (analysis.date && analysis.date !== "") {
          setTransactionDate(analysis.date.split('T')[0]);
        }
      }

      if (!filledAny && data.rawText && data.rawText.trim().length > 0) {
        // Fallback to raw text if AI didn't find specific fields
        const snippet = data.rawText.substring(0, 40).replace(/[\n\r]+/g, " ").trim() + "...";
        setDescription(snippet);
        alert("Text detected, but could not accurately extract details. Please check manually.");
      } else if (!filledAny) {
        alert("Could not detect any text in the image. Please try a clearer photo.");
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Could not detect transaction");
    } finally {
      setScanning(false);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processImageForOcr(file);
    event.target.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const parsedAmount = Number(amount);
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Enter a valid description and amount.");
      return;
    }

    try {
      setLoading(true);

      if (useAi) {
        await api.post("/api/transactions/ai-add", {
          description,
          amount: parsedAmount,
          transactionDate,
          type,
          entryMode: "actual",
        });
      } else {
        await api.post("/api/transactions", {
          description,
          amount: parsedAmount,
          transactionDate,
          type,
          category,
          note,
          isEssential: type === "expense" ? isEssential : true,
          entryMode: "actual",
        });
      }

      resetForm();
      onTransactionAdded?.();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not save transaction.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles size={16} className="text-cyan-400" /> Add Transaction
          </p>
          <p className="text-xs text-slate-400 mt-1">Track both income and expenses with optional AI assist.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <button
            type="button"
            onClick={startCamera}
            disabled={scanning || loading}
            className="px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs sm:text-sm flex items-center gap-2 disabled:opacity-60 transition-all hover:bg-emerald-500/20"
          >
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} 
            {scanning ? "Scanning..." : "Scan Receipt"}
          </button>
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={scanning || loading}
            className="px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs sm:text-sm flex items-center gap-2 disabled:opacity-60 transition-all hover:bg-emerald-500/20"
          >
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} 
            {scanning ? "Scanning..." : "Upload"}
          </button>

          <button
            type="button"
            onClick={handleAiSuggest}
            disabled={aiLoading}
            className="px-3 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs sm:text-sm flex items-center gap-2 disabled:opacity-60"
          >
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Suggest
          </button>
          <button
            type="button"
            onClick={() => setUseAi((prev) => !prev)}
            className={`px-3 py-2 rounded-xl border text-xs sm:text-sm transition-all ${
              useAi
                ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                : "border-slate-700 bg-slate-800 text-slate-300"
            }`}
          >
            AI Save: {useAi ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="lg:col-span-1 bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
            disabled={loading}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>

          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="lg:col-span-2 bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
            disabled={loading}
          />

          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="lg:col-span-1 bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
            disabled={loading}
          />

          <input
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            className="lg:col-span-1 bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            className="lg:col-span-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl py-2.5 px-3 text-sm font-semibold"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
            disabled={loading || useAi}
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm">
            <input
              type="checkbox"
              checked={isEssential}
              onChange={(e) => setIsEssential(e.target.checked)}
              disabled={loading || useAi || type !== "expense"}
            />
            Essential
          </label>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm"
            disabled={loading || useAi}
          />
        </div>
      </form>

      {aiSuggestion && (
        <div className="mt-3 text-xs sm:text-sm rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-cyan-100">
          AI: classified as <b>{aiSuggestion.type}</b> in <b>{aiSuggestion.category}</b>. {aiSuggestion.nudge}
        </div>
      )}

      {errorMessage && (
        <p className="mt-3 text-sm text-red-300 border border-red-500/30 bg-red-500/10 rounded-xl px-3 py-2 animate-in zoom-in-95">
          {errorMessage}
        </p>
      )}

      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-lg shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="flex w-full justify-between items-center mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Camera size={18} className="text-emerald-400" /> Scan Receipt
              </h3>
              <button 
                type="button" 
                onClick={stopCamera} 
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="relative w-full aspect-[3/4] sm:aspect-video bg-black rounded-xl overflow-hidden mb-5 border border-slate-800 shadow-inner">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 pointer-events-none border-2 border-emerald-500/20 rounded-xl m-8"></div>
            </div>
            
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={stopCamera}
                className="flex-1 py-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/40"
              >
                <Camera size={20} />
                Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </section>
  );
};

export default SmartInput;
