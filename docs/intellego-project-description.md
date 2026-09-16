# Intellego — The Super-Smart Lego Builder for Software (Project Description)

This document is a friendly, non-technical explanation of **Intellego**. It explains what our project is, why it is special, and how it works, using simple ideas and analogies so that anyone — even a five-year-old or a non-techy friend — can fully understand it, trust it, and see how powerful it is.

---

## 1. What is the project about?

Imagine you have a giant box of **Lego bricks** scattered all over your living room carpet. You want to build a massive, beautiful Lego castle. Normally, if you had a helper to help you build, they would have to open the instruction booklet and read it from the very first page every single time you asked them to find a piece or connect two blocks. They would get tired, they would move slowly, and they would ask you the same questions over and over again.

**Intellego** is like a **magical builder friend** who lives right inside your computer. Instead of reading the whole instruction booklet from start to finish every single time you talk, your friend does something much smarter. The very first time they look at your Lego pile on the carpet, they take a quick picture and build a **perfect 3D mental map** of every single brick, every connector, and how they all fit together. 

Because they have this mental map in their head, they already know where everything is! You can talk to them just like a friend, and they can instantly help you plan, build, and fix your creations. They live in a private app on your actual computer (not on some far-away website), meaning they can see and touch the actual files (your Lego bricks) on your hard drive directly, making them incredibly fast, helpful, and safe.

---

## 2. What problem is it solving?

Right now, other helpers that people use to build software have three big problems that make building slow, expensive, and a bit scary:

*   **The Forgetful Friend (The Re-Reading Problem):** Most AI helpers are very forgetful. Every time you ask them a question like "Where does this blue block go?", they have to re-read your entire collection of files from scratch. This wastes a lot of time (latency) and uses up a massive amount of electric power and tokens (which cost real money).
*   **The Glass Box (The Sandbox Problem):** Many helpers live inside web browsers or are locked inside a glass box. They cannot touch your actual computer files directly. They have to ask you to copy and paste pieces of your project into their chat box, which is like trying to build a Lego castle by describing the blocks through a window instead of just sitting on the carpet.
*   **The Mischievous Builder (The Safety Problem):** Some helpers might try to change your code when you are not looking, which can accidentally break your project or mess up your files without you knowing why.

**Intellego** solves all of these problems at once:
1.  It builds a **Semantic Knowledge Graph** (a permanent, smart 3D mental map) of your project, so it only has to look at changes once. It never forgets, saving time and money.
2.  It is a **native desktop application**, which means it sits right on the carpet with you and has direct, unsandboxed access to watch and edit your files on your computer.
3.  It has an **Edit Preview safety shield**. It will never, ever touch your files behind your back. Before it makes any change, it shows you a clear "before-and-after" picture (a diff) and waits for you to say "Yes, go ahead!"

---

## 3. What is the workflow (in general terms)?

Here is how data and control flow through Intellego when you want to build or change something:

```
 [Your Code on Disk] ──> [Magical Scanner] ──> [3D Mental Map]
                                                    │
                                                    ▼
 [You Click "YES!"] <── [Before/After Picture] <── [Planning Committee] <── [You ask a question]
         │
         ▼
 [Castle gets updated!]
```

Let's walk through what happens step-by-step when you use Intellego:

1.  **Scanning the Lego Room:** When you first open your project folder, Intellego uses its magnifying glass to scan all your files. It figures out which files connect to each other and stores this map in its memory notebook.
2.  **Asking for Help:** You type a message in the chat box, like: *"Hey, I want to add a front door to our castle."*
3.  **Thinking and Planning:** Intellego looks at its mental map to see exactly where the front wall is. It gathers a few smart helper agents to talk about it and write down a plan.
4.  **Showing the Blueprint (The Preview):** Instead of just building it immediately, Intellego shows you a picture on your screen: *"Here is the front wall right now, and here is what it will look like with the new door. Do you like it?"*
5.  **Snapping it Together (Applying):** You look at the blueprint, see that it looks perfect, and click the "Approve" button. Intellego instantly reaches onto your computer's drive and safely builds the door.

---

## 4. What technologies are being used?

To make all of this magic happen, Intellego uses a team of special tools, each playing a very important role:

| Technology Name | What is its role in our project? (The Analogy) |
| :--- | :--- |
| **Electron** | **The Spaceship Cabin:** This is the outer shell of the app. It lets the helper live directly on your computer as a real, installable desktop app with full permission to access your files. |
| **React + Vite** | **The Control Panel:** The beautiful TV screen, chat panels, buttons, and sliding views that you see and click on. It makes interacting with the AI smooth and fun. |
| **Python + FastAPI** | **The Busy Workshop:** The engine room running quietly under the floorboards. It handles all the heavy logic, organizes files, and does the hard work. |
| **Tree-sitter** | **The Brick Scanner:** A special magnifying glass that reads your code files and instantly understands how they fit together, like identifying Lego knobs and sockets. |
| **LangGraph** | **The Planning Committee:** A group of smart supervisor agents (a Planner, a Builder, and a Reviewer) who coordinate together to solve your task step-by-step. |
| **SQLite** | **The Magical Notebook:** A database where the app writes down the mental map of your codebase, so it remembers everything even if you turn off your computer. |
| **NVIDIA Nemotron** | **The Wisest Mentor:** A super-smart brain that lives in a secure cloud library. The app calls this mentor on a magic phone whenever it needs deep reasoning to solve a problem. |

---

## 5. How do these technologies connect?

Let's follow the chain of hand-offs to see how these tools talk to each other to help you build:

1.  **The Start:** You type a request into the **Control Panel (React + Vite)** inside the **Spaceship Cabin (Electron)**.
2.  **Passing the Message:** The cabin sends your request down to the **Busy Workshop (Python + FastAPI)** using a private local pathway (`127.0.0.1` loopback) that no one else on the internet can see.
3.  **Scanning and Writing:** The workshop uses its **Brick Scanner (Tree-sitter)** to inspect your files, draws a 3D map of the connections, and saves that map inside the **Magical Notebook (SQLite)** so it is always ready.
4.  **Gathering the Committee:** The workshop calls the **Planning Committee (LangGraph)**. The committee reads the map from the Notebook and works out what needs to change.
5.  **Getting Advice:** The committee makes a quick phone call to the **Wisest Mentor (NVIDIA Nemotron)** to get expert advice on how to write the code perfectly.
6.  **The Safety Check:** The workshop builds a before-and-after blueprint and sends it back up to your **Control Panel (React + Vite)** screen.
7.  **The Final Snap:** Once you click the "Approve" button, the **Busy Workshop (FastAPI)** is given the green light to write the changes directly to your files on disk.

**In short:** You command the dashboard, the local engine scans the toys and plans the changes with a smart cloud brain, and nothing touches your computer until you see the blueprint and click "Go!"
