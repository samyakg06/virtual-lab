# 🎬 Virtual Lab — Demo Steps (No Voiceover)

> **Duration:** ~5 minutes  
> **Setup:** Run `npm run dev` → opens `localhost:3000`  
> **Need:** Two browsers side-by-side for multiplayer (Chrome + Edge/Incognito)

---

## 1. Landing Page (~10s)
- [ ] Show the landing page
- [ ] Click **Get Started**

---

## 2. Local Canvas — Build & Simulate (~60s)

### Spawn Objects
- [ ] Click **BLOCK** in the left panel → block appears on canvas
- [ ] Click **SPHERE** → sphere appears
- [ ] Drag a **WEDGE** from the panel and drop it on the canvas

### Run Physics
- [ ] Click **RUN** → objects fall and collide
- [ ] Wait 3 seconds to show physics
- [ ] Click **PAUSE** → everything freezes
- [ ] Drag an object while paused to reposition it
- [ ] Click **RUN** again → click **SLOW-MO** → show 0.25x speed
- [ ] Click **RESET** → canvas clears

### Joints
- [ ] Spawn a **BLOCK**
- [ ] Click **JOINTS** tab → select **Spring**
- [ ] Click the block, then click empty space above it → spring created
- [ ] Click **RUN** → show it bouncing on the spring
- [ ] Click **RESET**

### Locks
- [ ] Spawn two **BLOCKS** (one above, one below)
- [ ] Click **LOCKS** tab → select **Pin Body** → click the top block
- [ ] Click **RUN** → top block stays, bottom falls
- [ ] Click **RESET**

### Forces & Environment
- [ ] Click **FORCES** tab
- [ ] Drag **Gravity** slider to 0x (zero-g), then to 3x, then back to 1x
- [ ] Drag **Friction** slider to show range
- [ ] Turn on **Wind Force** → spawn a sphere → **RUN** → show it drifting
- [ ] Turn off wind → **RESET**

### Inspector & Analytics
- [ ] Spawn a block → click on it → show Inspector panel (size, mass, density)
- [ ] Click a material preset (Cork / Wood / Iron)
- [ ] Click **RUN** → point to the **Live Diagnostics** energy graph on the right
- [ ] **RESET**

---

## 3. Experiment Library (~45s)

- [ ] Click **LIBRARY** in top nav → show the 4 experiment cards

### Pendulum
- [ ] Click **Simple Pendulum Lab** card → it auto-loads
- [ ] Click **RUN** → show swinging, angle display, period readout
- [ ] **RESET**

### Pulley (Atwood Machine)
- [ ] Go to **LIBRARY** → load **Pulley & Weight System**
- [ ] Click **RUN** → show masses moving, force arrows (red/green/yellow)
- [ ] **RESET**

### Collision Lab
- [ ] Load **Collision & Momentum Lab**
- [ ] Click **RUN** → show spheres colliding, velocity arrows
- [ ] **RESET**

---

## 4. Guest Login (~10s)
- [ ] Type a name (e.g. **"Sam"**) in the top-right **Guest Name** box
- [ ] Click **GO** → avatar appears

---

## 5. Multiplayer (~90s)

> Arrange Browser 1 (left) and Browser 2 (right) side-by-side

### Create Room (Browser 1)
- [ ] Click **SHARED CANVAS** tab
- [ ] Type **"Physics Lab Demo"** → click **+ Create Room**
- [ ] Copy the room URL (click the 🔗 link icon)

### Join Room (Browser 2)
- [ ] Open Browser 2 → go to `localhost:3000`
- [ ] Log in as guest with different name (e.g. **"Alex"**)
- [ ] Paste the room URL → canvas loads

### Show Cursor Sync
- [ ] Move mouse in Browser 2 → show cursor with **"ALEX"** label appearing in Browser 1
- [ ] Move mouse in Browser 1 → show cursor with **"SAM"** label in Browser 2

### Show Object Sync
- [ ] Browser 1: click **BLOCK** → block appears in BOTH browsers
- [ ] Browser 2: click **SPHERE** → sphere appears in BOTH browsers

### Show Run-State Sync
- [ ] Browser 1: click **RUN** → BOTH browsers start simulating

### Show Persistence
- [ ] Close Browser 2
- [ ] Reopen the room URL in Browser 2 → objects are still there

---

## 6. Backend Proof (~15s)
- [ ] Open `localhost:3002/api/health` in a new tab → show JSON response
- [ ] Briefly show the server terminal with connection/room logs

---

## 7. Done! 🎉
- [ ] Show the full app one final time
