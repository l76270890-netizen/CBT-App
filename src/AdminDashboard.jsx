import React, { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const subjects = [
  "Mathematics", "English", "Physics", "Chemistry", "Biology",
  "Government", "Economics", "Literature", "CRS", "Geography"
];

type Props = {
  setActivePage: (page: string) => void
}

export default function AdminDashboard({ setActivePage }: Props) {
  const [email, setEmail] = useState("Lawrenceifeanyi0001@gmail.com");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");

  const [subject, setSubject] = useState("Mathematics");
  const [examType, setExamType] = useState("JAMB");
  const [year, setYear] = useState("2024");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setMessage("");
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      setUser(res.user);
      setMessage("Login successful!");
    } catch (err: any) {
      alert("Login Failed: " + err.message);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setMessage("");
    try {
      await addDoc(collection(db, "questions"), {
        subject,
        examType,
        year: Number(year),
        question,
        options: { A: options[0], B: options[1], C: options[2], D: options[3] },
        correctAnswer,
        explanation,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      setMessage("✅ Question Added Successfully!");
      setQuestion(""); setOptions(["","","",""]); setExplanation("");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
    setLoading(false);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOpts = [...options];
    newOpts[index] = value;
    setOptions(newOpts);
  }

  if (!user) {
    return (
      <div style={{ padding: 20, background: "#f4f4f4", minHeight: "100vh" }}>
        <div style={{ maxWidth: 800, margin: "20px auto", background: "white", padding: 30, borderRadius: 10 }}>
          <h2>YOURCBT Admin Login</h2>
          <input placeholder="Admin Email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%", padding:12, marginBottom:10, border:"1px solid #ddd", borderRadius:5}} />
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:"100%", padding:12, marginBottom:10, border:"1px solid #ddd", borderRadius:5}} />
          <button onClick={handleLogin} style={{width:"100%", padding:12, background:"#1a73e8", color:"white", border:"none", borderRadius:5}}>Login</button>
          <button onClick={()=>setActivePage('home')} style={{width:"100%", padding:12, background:"#444", color:"white", border:"none", borderRadius:5, marginTop:10}}>Back Home</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, background: "#f4f4f4", minHeight: "100vh" }}>
      <div style={{ maxWidth: 800, margin: "20px auto", background: "white", padding: 30, borderRadius: 10 }}>
        <div style={{display: "flex", justifyContent: "space-between"}}>
          <h2>Add New Question</h2>
          <button onClick={() => signOut(auth).then(()=>setUser(null))} style={{padding:"8px 16px", background:"red", color:"white", border:"none", borderRadius:5}}>Logout</button>
        </div>
        {message && <p style={{color: "green"}}>{message}</p>}
        <form onSubmit={handleAddQuestion} style={{display: "flex", flexDirection: "column", gap: 15}}>
          <div style={{display: "flex", gap: 10}}>
            <select value={examType} onChange={e=>setExamType(e.target.value)} style={{width:"100%", padding:12, border:"1px solid #ddd", borderRadius:5}}><option>JAMB</option><option>WAEC</option><option>NECO</option><option>POSTUTME</option></select>
            <select value={subject} onChange={e=>setSubject(e.target.value)} style={{width:"100%", padding:12, border:"1px solid #ddd", borderRadius:5}}>{subjects.map(s => <option key={s}>{s}</option>)}</select>
            <input type="number" value={year} onChange={e=>setYear(e.target.value)} placeholder="Year" style={{width:"100%", padding:12, border:"1px solid #ddd", borderRadius:5}}/>
          </div>
          <textarea placeholder="Paste Question Here..." value={question} onChange={e=>setQuestion(e.target.value)} rows={4} required style={{width:"100%", padding:12, border:"1px solid #ddd", borderRadius:5}}/>
          {["A", "B", "C", "D"].map((opt, i) => (
            <input key={opt} placeholder={`Option ${opt}`} value={options[i]} onChange={e=> handleOptionChange(i, e.target.value)} required style={{width:"100%", padding:12, border:"1px solid #ddd", borderRadius:5}}/>
          ))}
          <select value={correctAnswer} onChange={e=>setCorrectAnswer(e.target.value)} style={{width:"100%", padding:12, border:"1px solid #ddd", borderRadius:5}}><option value="A">Correct Answer: A</option><option value="B">Correct Answer: B</option><option value="C">Correct Answer: C</option><option value="D">Correct Answer: D</option></select>
          <textarea placeholder="Explanation - Optional" value={explanation} onChange={e=>setExplanation(e.target.value)} rows={3} style={{width:"100%", padding:12, border:"1px solid #ddd", borderRadius:5}}/>
          <button type="submit" disabled={loading} style={{width:"100%", padding:12, background:"#1a73e8", color:"white", border:"none", borderRadius:5}}>{loading? "Adding..." : "Add Question to Database"}</button>
        </form>
      </div>
    </div>
  );
}