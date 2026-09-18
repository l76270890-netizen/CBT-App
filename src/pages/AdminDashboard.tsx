import React, { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import "./AdminDashboard.css";

const subjects = [
  "Mathematics", "English", "Physics", "Chemistry", "Biology", 
  "Government", "Economics", "Literature", "CRS", "Geography"
];

export default function AdminDashboard() {
  const [email, setEmail] = useState("Lawrenceifeanyi0001@gmail.com");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState("");

  const [subject, setSubject] = useState("Mathematics");
  const [examType, setExamType] = useState("JAMB");
  const [year, setYear] = useState("2024");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", ""]);
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
    setLoading(true);
    setMessage("");
    try {
      await addDoc(collection(db, "questions"), {
        subject,
        examType,
        year: Number(year),
        question,
        options: {
          A: options[0],
          B: options[1], 
          C: options[2],
          D: options[3]
        },
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
      <div className="admin-container">
        <div className="admin-card">
          <h2>YOURCBT Admin Login</h2>
          <input 
            placeholder="Admin Email" 
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            className="admin-input"
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            className="admin-input"
          />
          <button onClick={handleLogin} className="admin-btn">Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-card">
        <div className="admin-header">
          <h2>Add New Question</h2>
          <button onClick={() => signOut(auth).then(()=>setUser(null))} className="logout-btn">Logout</button>
        </div>
        
        {message && <p className="success-msg">{message}</p>}

        <form onSubmit={handleAddQuestion} className="admin-form">
          <div className="row-3">
            <select value={examType} onChange={e=>setExamType(e.target.value)} className="admin-input">
              <option>JAMB</option>
              <option>WAEC</option>
              <option>NECO</option>
              <option>POSTUTME</option>
            </select>
            <select value={subject} onChange={e=>setSubject(e.target.value)} className="admin-input">
              {subjects.map(s => <option key={s}>{s}</option>)}
            </select>
            <input type="number" value={year} onChange={e=>setYear(e.target.value)} placeholder="Year" className="admin-input"/>
          </div>

          <textarea 
            placeholder="Paste Question Here..." 
            value={question} 
            onChange={e=>setQuestion(e.target.value)}
            rows={4}
            required
            className="admin-input"
          />

          {["A", "B", "C", "D"].map((opt, i) => (
            <input 
              key={opt}
              placeholder={`Option ${opt}`}
              value={options[i]}
              onChange={e=> handleOptionChange(i, e.target.value)}
              required
              className="admin-input"
            />
          ))}

          <select value={correctAnswer} onChange={e=>setCorrectAnswer(e.target.value)} className="admin-input">
            <option value="A">Correct Answer: A</option>
            <option value="B">Correct Answer: B</option>
            <option value="C">Correct Answer: C</option>
            <option value="D">Correct Answer: D</option>
          </select>

          <textarea 
            placeholder="Explanation - Optional" 
            value={explanation} 
            onChange={e=>setExplanation(e.target.value)}
            rows={3}
            className="admin-input"
          />

          <button type="submit" disabled={loading} className="admin-btn">
            {loading? "Adding..." : "Add Question to Database"}
          </button>
        </form>
      </div>
    </div>
  );
}