# Virtual-Lab: Interactive Physics Sandbox & Collaborative Laboratory

Welcome to **Virtual-Lab**! This is a state-of-the-art, real-time 2D physics simulation platform designed to let you build, analyze, and experiment with physics concepts. Whether you are studying structural trusses, inelastic collisions, gear systems, or simply want to build complex mechanical machines, Virtual-Lab gives you all the tools in a highly responsive and visual workspace.

---

## Key Features at a Glance

*   **Local Canvas:** Your private, highly optimized physics sandbox. Build, run, modify, and reset experiments instantly on your local browser.
*   **Shared Canvas (Real-Time Collaboration):** Create collaborative lab rooms, invite classmates or teammates using a simple share link, see their mouse cursors move live, and build or debug physics simulations together in real-time.
*   **Library Page:** A curated gallery of pre-configured experiments and interactive templates. You can load these templates instantly to study advanced topics like Truss structural stress, gear systems, or collision momentum.
*   **Live Physics Analytics:** A real-time data panel displaying kinetic/potential energy graphs, velocity metrics, object mass, and forces to help you study the physical laws of nature visually.

---

## The Workspace Guide

### 1. The Left Side Toolbar (Your Building Blocks)
This toolbar houses everything you need to construct your simulations. Click any tab to open its panel:
*   **Objects:** Spawn structural boxes, physics spheres, heavy weights, and static grounds. Simply click an object type and click on the canvas to place it.
*   **Joints:** Add springs, ropes, or rotational pivot pins between physical bodies to create suspensions, swings, or bridges.
*   **Locks:** Weld two bodies together, or anchor an object in place so it is unaffected by gravity or collisions.
*   **Forces:** Control global settings like gravity strength and ground friction, or apply dynamic winds, constant thrust vectors, or direct manual force vectors to objects.

### 2. The Bottom Control Bar (The Time Machine)
Control the flow of time in your laboratory:
*   **Play:** Start the physics simulation engine to see objects fall, collide, and interact.
*   **Pause:** Freeze time at a specific frame to inspect exact speeds or coordinates.
*   **Reset:** Return the objects to their initial positions before you clicked Play.
*   **Clear World:** Instantly wipe out the canvas and start clean.

### 3. The Top Header
*   **Tabs (Local Canvas / Shared Canvas / Library):** Seamlessly navigate between your private space, collaborative rooms, or templates.
*   **Guest Login:** Sign in instantly by typing a Guest Name in the header box and clicking **Go**. Your custom avatar is generated automatically based on your name!

---

## Quick-Start Tutorial: Build Your First Spring-Mass Experiment

Follow these simple steps to build your very first interactive physics experiment from scratch:

1.  **Open the Sandbox:** Make sure you are on the **Local Canvas** tab in the header.
2.  **Add a Fixed Anchor:**
    *   Click on **Objects** in the left sidebar.
    *   Select the **Static Box** or **Ground** option.
    *   Click near the top-middle of the canvas to spawn a solid anchor block.
3.  **Add a Physics Weight:**
    *   Still in the **Objects** panel, select the **Weight Box** or **Heavy Sphere**.
    *   Click on the canvas about 3–4 grid spaces directly below your anchor block.
4.  **Connect them with a Spring:**
    *   Click on **Joints** in the left sidebar and select the **Spring** tool.
    *   Click first on your top anchor block, and then click on your bottom physics weight. A spring line will visually connect them!
5.  **Run the Simulation:**
    *   Click the **Play** button on the bottom control bar.
    *   *Watch your weight drop, bounce on the spring, and eventually settle!*
6.  **Analyze in Real-Time:**
    *   Look at the **Analytics Panel** on the right side. You will see real-time graphs showing the energy transfer as the spring bounces and settles.

---

## Teammate Collaboration: How to Use Shared Canvas

Virtual-Lab makes team assignments and group study sessions easy with built-in real-time collaboration.

### Step 1: Log in as a Guest
1.  Look at the top-right corner of the window.
2.  Type your name in the **Guest Name** input field.
3.  Click the **Go** button to log in. (Your custom robot avatar will appear).

### Step 2: Create a Room
1.  Navigate to the **Shared Canvas** tab in the top header.
2.  Type a title for your shared laboratory (e.g., *"Group 4 Physics Lab"*).
3.  Click the **+ Create Room** button. 

### Step 3: Invite Your Friends
1.  Once inside the room, look at the top header.
2.  Click the **`+` (Invite)** button next to your avatar.
3.  The shareable room link is now instantly copied to your clipboard!
4.  Send this link to your teammates. When they open it, they will join your room, their live mouse cursors will appear on your screen, and you can build, run, and modify experiments together in real-time!

---

## How to Run the Project Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- npm (Node Package Manager)

### Installation Steps

1. **Install Root Dependencies:**
   Install the dependencies for the frontend (React/Vite).
   ```bash
   npm install
   ```

2. **Install Server Dependencies:**
   Navigate into the `server` directory and install the backend dependencies (Express/Socket.io).
   ```bash
   cd server
   npm install
   cd ..
   ```

3. **Configure Environment Variables:**
   If you have a MongoDB instance or specific port configurations, create a `.env` file in the root or `server` directory (as required by the backend setup). By default, the application should run with its default fallback configurations.

### Running the Application

You can start both the frontend UI and the backend backend server simultaneously using a single command from the root directory:

```bash
npm run dev
```

> **Note for Reviewers**: You do **not** need to open a separate terminal to start the backend. The `npm run dev` script uses the `concurrently` package to automatically boot up the Node.js server (on port 3002) and the Vite React frontend (on port 3000) at the exact same time.

- The client application will be accessible at `http://localhost:3000`
- The real-time collaboration server will run automatically in the background at `http://localhost:3002`.
