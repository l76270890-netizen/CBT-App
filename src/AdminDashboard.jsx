import { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const subjects = ["Mathematics","English","Physics","Chemistry","Biology","Government","Economics","Literature","CRS","Geography"];

type Props = { setActivePage: (page: string) => void }

export default function AdminDashboard({ setActivePage }: Props) {
  const [email, setEmail] = useState("Lawrenceifeanyi0001@gmail.com");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");

  const [subject, setSubject] = useState("Mathematics");
  const [examType, setExamType] = useState("JAMB");
  const [year, setYear] = useState("2024");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["","","",""]);
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setMessage("");
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      setUser(res.user);
      setMessage("Login successful!");
    } catch (err: unknown) {
      const msg = err instanceof Error? err.message : "Unknown error";
      // Show friendly message for API key error
      if (msg.includes("api-key-not-valid")) {
        alert("API Key blocked! Go to console.cloud.google.com/apis/credentials?project=yourcbt-app-d6ee5 and set API restrictions to None");
      } else {
        alert("Login Failed: " + msg);
      }
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "questions"), {
        subject, examType, year: Number(year), question,
        options: { A: options[0], B: options[1], C: options[2], D: options[3] },
        correctAnswer, explanation, createdBy: user.uid, createdAt: serverTimestamp()
      });
      setMessage("✅ Question Added!");
      setQuestion(""); setOptions(["","","",""]); setExplanation("");
    } catch (err: unknown) {
      const msg = err instanceof Error? err.message : "Unknown error";
      alert("Error: " + msg);
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div style={{padding:20, background:"#f4f4f4", minHeight:"100vh"}}>
        <div style={{maxWidth:400, margin:"40px auto", background:"white", padding:30, borderRadius:10}}>
          <h2>YOURCBT Admin</h2>
          <p style={{fontSize:12, color:"#666"}}>If login fails api-key-not-valid: Fix in Google Cloud Console</p>
          <input value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%", padding:12, marginBottom:10, border:"1px solid #ddd", borderRadius:5}} />
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:"100%", padding:12, marginBottom:10, border:"1px solid #ddd", borderRadius:5}} />
          <button onClick={handleLogin} style={{width:"100%", padding:12, background:"#1a73e8", color:"white", border:"none", borderRadius:5}}>Login</button>
          <button onClick={()=>setActivePage('home')} style={{width:"100%", padding:12, background:"#444", color:"white", border:"none", borderRadius:5, marginTop:10}}>Back Home</button>
          {message && <p>{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:20, background:"#f4f4f4", minHeight:"100vh"}}>
      <div style={{maxWidth:800, margin:"20px auto", background:"white", padding:30, borderRadius:10}}>
        <div style={{display:"flex", justifyContent:"space-between"}}><h2>Add Question</h2><button onClick={() => signOut(auth).then(()=>setUser(null))} style={{padding:"8px 16px", background:"red", color:"white", border:"none", borderRadius:5}}>Logout</button></div>
        {message && <p style={{color:"green"}}>{message}</p>}
        <form onSubmit={handleAddQuestion} style={{display:"flex", flexDirection:"column", gap:15}}>
          <div style={{display:"flex", gap:10}}>
            <select value={examType} onChange={e=>setExamType(e.target.value)} style={{width:"100%", padding:12}}><option>JAMB</option><option>WAEC</option><option>NECO</option><option>POSTUTME</option></select>
            <select value={subject} onChange={e=>setSubject(e.target.value)} style={{width:"100%", padding:12}}>{subjects.map(s=><option key={s}>{s}</option>)}</select>
            <input type="number" value={year} onChange={e=>setYear(e.target.value)} style={{width:"100%", padding:12}} />
          </div>
          <textarea placeholder="Question" value={question} onChange={e=>setQuestion(e.target.value)} rows={4} required style={{width:"100%", padding:12}}/>
          {["A","B","C","D"].map((opt,i)=><input key={opt} placeholder={`Option ${opt}`} value={options[i]} onChange={e=>{const n=[...options]; n[i]=e.target.value; setOptions(n)}} required style={{width:"100%", padding:12}}/>)}
          <select value={correctAnswer} onChange={e=>setCorrectAnswer(e.target.value)} style={{width:"100%", padding:12}}><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select>
          <textarea placeholder="Explanation" value={explanation} onChange={e=>setExplanation(e.target.value)} rows={3} style={{width:"100%", padding:12}}/>
          <button type="submit" disabled={loading} style={{width:"100%", padding:12, background:"#1a73e8", color:"white", border:"none", borderRadius:5}}>{loading?"Adding...":"Add Question"}</button>
        </form>
      </div>
    </div>
  );
}