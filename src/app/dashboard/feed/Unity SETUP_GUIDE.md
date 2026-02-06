# Hearthbound - Unity Development Guide

## 🚀 Quick Start

### Step 1: Install Unity

1. Go to https://unity.com/download
2. Download **Unity Hub**
3. Install Unity Hub, then install **Unity 2022.3 LTS** (Long Term Support)
4. During installation, include:
   - ✅ Windows/Mac Build Support
   - ✅ iOS Build Support (for mobile)
   - ✅ Android Build Support (for mobile)

### Step 2: Create New Project

1. Open Unity Hub → **New Project**
2. Select **3D (URP)** template (Universal Render Pipeline - best for mobile + good visuals)
3. Name it "Hearthbound"
4. Click **Create Project**

### Step 3: Import Free Assets (Recommended)

Go to **Window → Asset Store** and search for these FREE assets:

**Terrain & Environment:**
- "Terrain Sample Asset Pack" by Unity
- "Low Poly Medieval Village" (many free options)
- "Nature Starter Kit 2" by Shapes

**Characters:**
- "RPG Character FREE" 
- "Simple People - Cartoon Characters"

**Effects:**
- "Cartoon FX Free" by Jean Moreno
- "Unity Particle Pack"

**Audio:**
- "FREE Casual Game SFX Pack"
- "Medieval Fantasy Music"

### Step 4: Project Structure

Create these folders in your Assets:
```
Assets/
├── Hearthbound/
│   ├── Scripts/
│   │   ├── Core/
│   │   ├── Buildings/
│   │   ├── Characters/
│   │   ├── Terrain/
│   │   └── UI/
│   ├── Prefabs/
│   │   ├── Buildings/
│   │   ├── Characters/
│   │   └── Environment/
│   ├── Materials/
│   ├── Textures/
│   ├── Audio/
│   └── Scenes/
```

---

## 📜 Core Scripts

Copy these scripts into your project:

### GameManager.cs
The central game controller.

### TerrainGenerator.cs  
Procedural terrain with biomes.

### BuildingSystem.cs
Place and manage buildings.

### DayNightCycle.cs
Dynamic lighting and sky.

### CameraController.cs
Orbit camera with zoom.

### SeasonManager.cs
Visual changes per season.

See the accompanying C# files for full implementations.

---

## 🎨 Visual Setup Guide

### 1. URP Settings for Best Visuals

**Edit → Project Settings → Graphics:**
- Set "Scriptable Render Pipeline Settings" to your URP asset

**Edit → Project Settings → Quality:**
- Shadows: Soft Shadows
- Shadow Resolution: 2048 (or 4096 for PC)
- Shadow Distance: 150

**URP Asset Settings (in Project window):**
- HDR: Enabled
- Anti Aliasing: 4x MSAA
- Main Light: Per Pixel
- Additional Lights: Per Pixel (limit 4)
- Shadows: Enabled
- Soft Shadows: Enabled

### 2. Post-Processing Setup

1. **Window → Package Manager**
2. Search "Post Processing" → Install
3. On your Main Camera, add **Volume** component
4. Add profile with:
   - Bloom (intensity 0.2-0.5)
   - Color Adjustments (slight warm tint)
   - Vignette (subtle, 0.2)
   - Ambient Occlusion (if performance allows)

### 3. Lighting Setup

1. **Window → Rendering → Lighting**
2. Environment:
   - Skybox Material: Create gradient skybox
   - Sun Source: Your Directional Light
3. Baked Global Illumination: Enable for static objects
4. Real-time GI: Enable if performance allows

### 4. Terrain Setup

1. **GameObject → 3D Object → Terrain**
2. Paint textures:
   - Grass (base layer)
   - Dirt (paths)
   - Rock (mountains)
   - Sand (beaches)
3. Paint trees using Unity's tree painter
4. Add grass details with Detail Mesh

---

## 🏗️ Building the Game

### Phase 1: Core Loop (Week 1-2)
- [ ] Terrain generation working
- [ ] Camera controller
- [ ] Day/night cycle
- [ ] Place one building type

### Phase 2: Buildings (Week 3-4)
- [ ] All building prefabs created
- [ ] Building placement system
- [ ] Resource costs
- [ ] Construction animation

### Phase 3: Characters (Week 5-6)
- [ ] Villager prefab with animations
- [ ] Basic AI (wander, work)
- [ ] Population system

### Phase 4: Gameplay (Week 7-8)
- [ ] Resource gathering
- [ ] Seasonal changes
- [ ] Events (raids, merchants)
- [ ] Manor upgrade system

### Phase 5: Polish (Week 9-12)
- [ ] Particle effects
- [ ] Sound design
- [ ] UI polish
- [ ] Mobile optimization
- [ ] Save/load system

---

## 📱 Mobile Optimization Tips

1. **Use LOD (Level of Detail)** on all 3D models
2. **Texture atlasing** - combine textures
3. **Object pooling** for particles and NPCs
4. **Bake lighting** where possible
5. **Use mobile shaders** from URP
6. **Target 30 FPS** for battery life
7. **Reduce draw calls** with static batching

---

## 🔧 Useful Unity Shortcuts

| Shortcut | Action |
|----------|--------|
| W, E, R | Move, Rotate, Scale tools |
| F | Focus on selected object |
| Ctrl+D | Duplicate |
| Ctrl+Shift+N | New empty GameObject |
| Ctrl+P | Play/Stop game |
| Ctrl+S | Save scene |

---

## 📚 Learning Resources

**Official:**
- Unity Learn: https://learn.unity.com
- Unity Manual: https://docs.unity3d.com

**YouTube Channels:**
- Brackeys (beginner-friendly)
- Sebastian Lague (procedural generation)
- Code Monkey (C# and systems)
- Blackthornprod (stylized visuals)

**Specific Tutorials to Search:**
- "Unity terrain tutorial"
- "Unity day night cycle URP"
- "Unity building placement system"
- "Unity RTS camera controller"
- "Unity procedural terrain generation"
- "Unity low poly medieval style"

---

## 💡 Pro Tips

1. **Start with gray boxes** - Get gameplay working before adding art
2. **Use prefabs for everything** - Makes iteration fast
3. **Test on mobile early** - Don't wait until the end
4. **Version control** - Use Git (GitHub Desktop is easy)
5. **Playtest weekly** - Fresh eyes catch problems
6. **Keep scope small** - Ship something, then expand

---

## Need Help?

I can generate:
- Complete C# scripts for any system
- Shader code for custom effects
- Step-by-step tutorials for specific features
- Debugging help when things break

Just ask! Let's build Hearthbound together. 🏰
