# Alien Survivor 3D

Static site. The 2D rules (600x600) run as-is and are drawn with three.js. Camera looks down. Movement stays on the ground plane. No build step.

Open through a static server (the page uses an ES module and an import map):

```
npx serve /workspace/alien-survivor-3d
```

## Controls

- Move: WASD, arrows, left stick, or DualSense left stick / d-pad
- Auto-fire is always on
- Q, 1, DualSense cross / square / L1: heal
- E, 2, DualSense circle / R1: bomb (ship rolls, blast radius 260, 150% damage)
- Level-up: arrows or d-pad, Enter / Space / cross to confirm. Offers Speed, Def, Atk, Mag
- Item buttons use pointerdown so they work while the stick is held
- Shop and gallery stay available from the menu and the death screen
