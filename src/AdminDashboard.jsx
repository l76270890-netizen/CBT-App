import React, { useState } from "react";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const subjects = [
  "Mathematics", "English", "Physics", "Chemistry", "Biology", 
  "Government", "Economics", "Literature", "CRS", "Geography"
];

export default function AdminDashboard() {
  const [email, setEmail] = useState("Lawrenceifeanyi0001@gmail.com");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");

  // Question form state
  const [subject, setSubject] = useState("Mathematics");
  const [examType, setExamType] = useState("JAMB");
  const [year, setYear] = useState("2024");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);

  // LOGIN
  const handleLogin = async () => {
    setMessage("");
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      setUser(res.user);
      setMessage("Login successful!");
    } catch (err) {
      alert("Login Failed: " + err.message);
    }
  };

  // ADD QUESTION
  const handleAddQuestion = async (e) => {
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
      // Reset form
      setQuestion(""); setOptions(["","","",""]); setExplanation("");
    } catch (err) {
      alert("Error: " + err.message);
    }
    setLoading(false);
  };

  const handleOptionChange = (index, value) => {
    const newOpts = [...options];
    newOpts[index] = value;
    setOptions(newOpts);
  }

  // LOGIN SCREEN
  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2>YOURCBT Admin Login</h2>
          <input 
            placeholder="Admin Email" 
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            style={styles.input}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            style={styles.input}
          />
          <button onClick={handleLogin} style={styles.button}>Login</button>
        </div>
      </div>
    );
  }

  // DASHBOARD SCREEN
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{display: "flex", justifyContent: "space-between"}}>
          <h2>Add New Question</h2>
          <button onClick={() => signOut(auth).then(()=>setUser(null))} style={styles.logoutBtn}>Logout</button>
        </div>
        
        {message && <p style={{color: "green"}}>{message}</p>}

        <form onSubmit={handleAddQuestion} style={{display: "flex", flexDirection: "column", gap: 15}}>
          
          <div style={{display: "flex", gap: 10}}>
            <select value={examType} onChange={e=>setExamType(e.target.value)} style={styles.input}>
              <option>JAMB</option>
              <option>WAEC</option>
              <option>NECO</option>
              <option>POSTUTME</option>
            </select>
            <select value={subject} onChange={e=>setSubject(e.target.value)} style={styles.input}>
              {subjects.map(s => <option key={s}>{s}</option>)}
            </select>
            <input type="number" value={year} onChange={e=>setYear(e.target.value)} placeholder="Year" style={styles.input}/>
          </div>

          <textarea 
            placeholder="Paste Question Here..." 
            value={question} 
            onChange={e=>setQuestion(e.target.value)}
            rows={4}
            required
            style={styles.input}
          />

          {["A", "B", "C", "D"].map((opt, i) => (
            <input 
              key={opt}
              placeholder={`Option ${opt}`}
              value={options[i]}
              onChange={e=> handleOptionChange(i, e.target.value)}
              required
              style={styles.input}
            />
          ))}

          <select value={correctAnswer} onChange={e=>setCorrectAnswer(e.target.value)} style={styles.input}>
            <option value="A">Correct Answer: A</option>
            <option value="B">Correct Answer: B</option>
            <option value="C">Correct Answer: C</option>
            <option value="D">Correct Answer: D</option>
          </select>

          <textarea 
            placeholder="Explanation - Optional. E.g: Why is A correct?" 
            value={explanation} 
            onChange={e=>setExplanation(e.target.value)}
            rows={3}
            style={styles.input}
          />

          <button type="submit" disabled={loading} style={styles.button}>
            {loading? "Adding..." : "Add Question to Database"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 20, background: "#f4f4f4", minHeight: "100vh" },
  card: { maxWidth: 800, margin: "20px auto", background: "white", padding: 30, borderRadius: 10, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" },
  input: { width: "100%", padding: 12, borderRadius: 5, border: "1px solid #ddd", fontSize: 16 },
  button: { width: "100%", padding: 12, background: "#1a73e8", color: "white", border: "none", borderRadius: 5, fontSize: 16, cursor: "pointer" },
  logoutBtn: { padding: "8px 16px", background: "red", color: "white", border: "none", borderRadius: 5, cursor: "pointer" }
}