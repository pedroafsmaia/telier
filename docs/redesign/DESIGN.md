# Design System Specification

## 1. Overview & Creative North Star: "The Architectural Monolith"

This design system is engineered for the precise, demanding environment of architectural practice. Moving away from the "software-as-a-service" aesthetic of rounded gradients and soft shadows, this system adopts a **Creative North Star titled "The Architectural Monolith."**

The aesthetic is characterized by **Sober Precision**. Like a blueprint or a physical drafting table, every element must feel intentional, structural, and devoid of unnecessary decoration. We break the "template" look through rigid, high-contrast structural lines and the juxtaposition of humanistic sans-serifs with the cold, mechanical accuracy of monospaced data. We do not use "fluff"—no blurs, no glassmorphism, and no shadows. Depth is achieved purely through tonal shifts and 1px "technical" strokes.

---

## 2. Colors: Tonal Architecture

The palette is strictly functional. It mimics the deep blacks of a CAD viewport and the neutral grays of raw concrete and steel.

### Functional Palette
- **Background (`#0e0e0e`):** The absolute base. Used for the largest surface areas to minimize eye strain during long studio hours.
- **Primary Blue (`#0055FF`):** Reserved strictly for action and "In-Progress" states. It is the "blueprint ink" of the system.
- **Success Green (`#22c55e`):** Used for "Done" or "Approved" states.
- **Alert Red (`#ec7c8a`):** Used for critical deadlines or over-budget alerts.

### The "Technical Stroke" Rule
Contrary to modern trends of "no-line" UI, this system **mandates the use of 1px solid borders** (`#2A2A2A` or `outline_variant`) to define workspaces. In an architectural tool, lines represent walls, boundaries, and measurements. 

### Surface Hierarchy
Nesting is achieved through "Tonal Steps." A container should never rely on a shadow to lift off the page.
1.  **Level 0 (Base):** `surface` (`#0e0e0e`)
2.  **Level 1 (Sidebar/Nav):** `surface_container_low` (`#131313`)
3.  **Level 2 (Main Cards):** `surface_container` (`#191a1a`)
4.  **Level 3 (Popovers/Modals):** `surface_container_high` (`#1f2020`)

---

## 3. Typography: The Human & The Machine

We employ a dual-font strategy to separate editorial intent from technical data.

- **The Human (Inter):** Used for all UI labels, headers, and descriptions. It provides legibility and a professional, neutral tone.
    - *Display-LG/MD:* Inter 700. Use for project titles. Tight tracking (-2%).
    - *Body-MD:* Inter 400. The workhorse for all descriptions.
- **The Machine (DM Mono):** Used for all numerical data, timestamps, coordinates, and budget figures.
    - *Utility:* DM Mono 400/500. It conveys "Calculated Accuracy." Whenever a number appears in the UI, it must switch to DM Mono.

**Hierarchy Note:** Use high contrast in scale rather than color. A `headline-lg` in white (`on_surface`) next to a `label-sm` in `on_surface_variant` creates an editorial "magazine" feel within a technical tool.

---

## 4. Elevation & Structural Integrity

We reject "Ambient Shadows." To convey hierarchy, we use **Structural Layering**.

- **The 1px Rule:** Every container (Card, Sidebar, Input) must use a 1px border of `outline_variant` (`#484848`) or a custom `#2A2A2A`.
- **Inner Radii:** To maintain visual harmony, use the "Nested Radius" logic.
    - Outer Containers (Large project boards): `xl` (12px / 0.75rem).
    - Inner Components (Buttons, Inputs): `md` (6px / 0.375rem).
- **Zero Blur:** Under no circumstances should `backdrop-filter: blur` be used. If a modal overlaps content, the background remains solid `surface` or a high-opacity `surface_dim`.

---

## 5. Components: Studio primitives

### Buttons
- **Primary:** Solid `#0055FF` background with `on_background` (White) text. Sharp, high-contrast, no gradient.
- **Secondary:** `background: transparent`, `border: 1px solid #484848`. Text is `on_surface`.
- **Tertiary:** `background: transparent`, no border. Used for low-priority utility actions.

### Input Fields
- **Default State:** `surface_container_low` background with a 1px `outline_variant` border. 
- **Focus State:** Border changes to `primary` blue. No "glow" or outer shadow.
- **Data Inputs:** Use DM Mono for the text input value to emphasize data entry precision.

### Tags & Pills
- **Visual Style:** Low-opacity background based on the functional color (e.g., Blue at 10% opacity) with a solid 1px border of the same color at 20% opacity. 
- **Typography:** `label-sm` in Inter 600, uppercase with +5% letter spacing.

### Architecture-Specific Components
- **The "Timeline Ruler":** A horizontal component using DM Mono for dates, separated by 1px vertical strokes. No background fill.
- **Status Indicators:** Small 8px solid circles. No pulse effects. Blue (Active), Green (Complete), Grey (Draft).

---

## 6. Do's and Don'ts

### Do
- **Do** use DM Mono for every single digit or price. Consistency is key to the "Studio" feel.
- **Do** use `24` (5.5rem) or `20` (4.5rem) spacing units to give complex project data "room to breathe."
- **Do** align every element to a strict 4px grid. If it’s off by 1px, the "precision" aesthetic fails.

### Don'ts
- **Don't** use "Soft" UI elements. If a corner can be 6px, don't make it 20px. 
- **Don't** use gradients, even subtle ones. Use solid hex codes only.
- **Don't** use divider lines *inside* a card. Use `surface_container` shifts or vertical whitespace (`spacing.8`) to separate content blocks.
- **Don't** use icons with rounded "organic" ends. Use sharp, geometric, or monolinear icon sets (like Phosphor or Lucide in "Regular" weight).