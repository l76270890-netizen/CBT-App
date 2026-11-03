export const questionsBank: Record<string, any[]> = {
    english: [
        { id: 1, question: "Choose the word nearest in meaning: The boy was very INTELLIGENT", options: ["Dull", "Smart", "Lazy", "Rude"], answer: 1, topic: "Lexis & Structure", explanation: "Intelligent means smart" },
        { id: 2, question: "Choose the correct option: She ___ to school every day.", options: ["go", "goes", "going", "gone"], answer: 1, topic: "Lexis & Structure" },
        { id: 3, question: "What is the synonym for 'Benevolent'?", options: ["Wicked", "Kind", "Selfish", "Angry"], answer: 1, topic: "Lexis & Structure" },
    ],
    math: [
        { id: 1, question: "Simplify: 2x + 3x - x", options: ["4x", "5x", "3x", "2x"], answer: 0, topic: "Algebra" },
        { id: 2, question: "Find x if 2x = 10", options: ["2", "5", "10", "20"], answer: 1, topic: "Algebra" },
        { id: 3, question: "What is the probability of getting a head when tossing a coin?", options: ["1", "1/2", "1/3", "0"], answer: 1, topic: "Probability" },
    ],
    biology: [
        { id: 1, question: "The powerhouse of the cell is?", options: ["Nucleus", "Mitochondrion", "Ribosome", "Chloroplast"], answer: 1, topic: "Cell Biology" },
        { id: 2, question: "Which blood group is universal donor?", options: ["A", "B", "AB", "O"], answer: 3, topic: "Human Anatomy" },
    ],
    chemistry: [
        { id: 1, question: "What is the atomic number of Carbon?", options: ["6", "8", "12", "14"], answer: 0, topic: "Atomic Structure" },
        { id: 2, question: "pH of neutral solution is?", options: ["0", "7", "14", "1"], answer: 1, topic: "Acids & Bases" },
    ],
    physics: [
        { id: 1, question: "SI unit of force is?", options: ["Joule", "Newton", "Watt", "Pascal"], answer: 1, topic: "Mechanics" },
        { id: 2, question: "Speed of light in vacuum is?", options: ["3x10^8 m/s", "3x10^6 m/s", "3x10^5 m/s", "3x10^7 m/s"], answer: 0, topic: "Waves" },
    ],
    govt: [
        { id: 1, question: "Nigeria became a republic in?", options: ["1960", "1963", "1979", "1999"], answer: 1, topic: "Constitution" },
        { id: 2, question: "The first political party in Nigeria was?", options: ["NNDP", "NCNC", "AG", "NPC"], answer: 0, topic: "Political Parties" },
    ],
    economics: [
        { id: 1, question: "Scale of preference shows?", options: ["Wants arranged by importance", "Price list", "Income level", "Profit"], answer: 0, topic: "Micro Economics" },
        { id: 2, question: "Demand curve slopes?", options: ["Upward", "Downward", "Vertical", "Horizontal"], answer: 1, topic: "Demand & Supply" },
    ],
    commerce: [
        { id: 1, question: "The middleman between wholesaler and consumer is?", options: ["Producer", "Retailer", "Agent", "Broker"], answer: 1, topic: "Trade" },
    ],
    accounting: [
        { id: 1, question: "Double entry rule: Debit the receiver and?", options: ["Credit the giver", "Debit the giver", "Credit the receiver", "None"], answer: 0, topic: "Double Entry" },
    ],
    // Add agric, literature, crk, history, business same way
}

export const getQuestions = (subjectId: string, topic?: string, limit?: number) => {
    let qs = questionsBank[subjectId] || []
    if (topic) qs = qs.filter(q => q.topic === topic)
    if (limit) qs = qs.slice(0, limit)
    return qs
}