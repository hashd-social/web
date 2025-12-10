# HASHD Semantic Design System

A style-agnostic CSS class system for the HASHD frontend.

## Color Hierarchy

| Level | Color | Usage |
|-------|-------|-------|
| **Primary** | Cyan `#00ffff` | Main brand, CTAs, links, primary actions |
| **Secondary** | Magenta `#ff00ff` | Settings, secondary actions, accents |
| **Tertiary** | Green `#00ff41` | Success, verified, positive states |
| **Quaternary** | Orange `#f97316` | Special features, premium, highlights |

## Semantic Colors

| Semantic | Maps To | Usage |
|----------|---------|-------|
| **Success** | Tertiary (Green) | Confirmations, verified states |
| **Warning** | Yellow `#f59e0b` | Caution, important notices |
| **Error** | Red `#ef4444` | Errors, destructive actions |
| **Info** | Primary (Cyan) | Information, tips |

---

## Quick Reference

### Buttons

```html
<!-- Primary actions -->
<button class="btn btn-primary">Primary</button>
<button class="btn btn-primary-solid">Primary Solid</button>

<!-- Color variants -->
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-tertiary">Tertiary</button>
<button class="btn btn-quaternary">Quaternary</button>

<!-- Semantic variants -->
<button class="btn btn-danger">Danger</button>
<button class="btn btn-warning">Warning</button>
<button class="btn btn-ghost">Ghost</button>

<!-- Special -->
<button class="btn btn-cyber">Cyber (animated)</button>

<!-- Modifiers -->
<button class="btn btn-primary btn-block">Full Width</button>
<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary btn-lg">Large</button>

<!-- Icon buttons -->
<button class="btn-icon">Icon</button>
<button class="btn-icon btn-icon-secondary">Icon Secondary</button>
<button class="btn-icon btn-icon-danger">Icon Danger</button>

<!-- Toggle -->
<button class="btn-toggle active">
  <span class="btn-toggle-knob"></span>
</button>
```

### Cards & Containers

```html
<!-- Basic cards -->
<div class="card">Basic card</div>
<div class="card-bordered">Bordered card</div>
<div class="card-interactive">Clickable card</div>

<!-- Feature cards -->
<div class="card-feature">Primary feature</div>
<div class="card-feature-secondary">Secondary feature</div>
<div class="card-feature-quaternary">Special feature</div>
```

### Alerts (Notes, Warnings, etc.)

```html
<!-- Full alerts with title -->
<div class="alert-info">
  <h4 class="alert-title">Info Title</h4>
  <p class="alert-text">Info message text</p>
</div>

<div class="alert-success">
  <h4 class="alert-title">Success Title</h4>
  <p class="alert-text">Success message text</p>
</div>

<div class="alert-warning">
  <h4 class="alert-title">Warning Title</h4>
  <p class="alert-text">Warning message text</p>
</div>

<div class="alert-error">
  <h4 class="alert-title">Error Title</h4>
  <p class="alert-text">Error message text</p>
</div>

<div class="alert-special">
  <h4 class="alert-title">Special Title</h4>
  <p class="alert-text">Special/premium message</p>
</div>

<!-- Inline alerts (compact, no title) -->
<div class="alert-inline alert-inline-info">Info text</div>
<div class="alert-inline alert-inline-success">Success text</div>
<div class="alert-inline alert-inline-warning">Warning text</div>
<div class="alert-inline alert-inline-error">Error text</div>
```

### Typography

```html
<!-- Titles -->
<h1 class="text-title">Section Title</h1>
<h1 class="text-title-lg">Large Title</h1>
<h1 class="text-title-xl">Extra Large Title</h1>

<!-- Subtitles (color variants) -->
<h2 class="text-subtitle">Primary Subtitle</h2>
<h2 class="text-subtitle-secondary">Secondary Subtitle</h2>
<h2 class="text-subtitle-tertiary">Tertiary Subtitle</h2>
<h2 class="text-subtitle-quaternary">Quaternary Subtitle</h2>

<!-- Body text -->
<p class="text-body">Body text</p>
<p class="text-body-lg">Large body text</p>

<!-- Labels -->
<label class="text-label">Form Label</label>
<label class="text-label-bar">Label with bar indicator</label>

<!-- Muted/Helper -->
<span class="text-muted">Muted text</span>
<span class="text-muted-sm">Small muted text</span>

<!-- Data display -->
<span class="text-data">0x1234...5678</span>
<span class="text-data-highlight">Important Value</span>

<!-- Neon text (with glow) -->
<span class="text-neon-primary">Glowing cyan</span>
<span class="text-neon-secondary">Glowing magenta</span>
<span class="text-neon-tertiary">Glowing green</span>
<span class="text-neon-quaternary">Glowing orange</span>

<!-- Section headers with border -->
<div class="section-header">
  <Icon />
  <span class="text-subtitle">Section</span>
</div>
```

### Inputs

```html
<!-- Basic inputs -->
<input class="input" placeholder="Standard input" />
<input class="input input-sm" placeholder="Small input" />
<input class="input input-lg" placeholder="Large input" />

<textarea class="textarea" placeholder="Textarea"></textarea>

<select class="select">
  <option>Option 1</option>
</select>

<!-- States -->
<input class="input input-error" />
<input class="input input-success" />

<!-- Form field with label -->
<div class="form-field">
  <label class="form-field-label">Label</label>
  <input class="input" />
  <span class="form-field-helper">Helper text</span>
</div>
```

### Badges

```html
<!-- Color variants -->
<span class="badge badge-primary">Primary</span>
<span class="badge badge-secondary">Secondary</span>
<span class="badge badge-tertiary">Tertiary</span>
<span class="badge badge-quaternary">Quaternary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-error">Error</span>
<span class="badge badge-neutral">Neutral</span>

<!-- Pill style -->
<span class="badge badge-primary badge-pill">Pill Badge</span>

<!-- Status badges -->
<span class="badge-status badge-status-verified">Verified</span>
<span class="badge-status badge-status-invalid">Invalid</span>
<span class="badge-status badge-status-pending">Pending</span>

<!-- HashdTag badge -->
<span class="badge-hashdtag">HASHDTAG</span>
```

### Modals

```html
<div class="modal-overlay">
  <div class="modal modal-lg">
    <div class="modal-header">
      <div class="modal-header-content">
        <div class="modal-icon"><Icon /></div>
        <div>
          <h3 class="modal-title">Modal Title</h3>
          <p class="modal-subtitle">Optional subtitle</p>
        </div>
      </div>
      <button class="modal-close"><X /></button>
    </div>
    
    <div class="modal-body">
      Content here
    </div>
    
    <div class="modal-footer">
      <button class="btn btn-ghost">Cancel</button>
      <button class="btn btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

### Utilities

```html
<!-- Layout -->
<div class="flex-center">Centered</div>
<div class="flex-between">Space between</div>
<div class="flex-col gap-4">Column with gap</div>

<!-- Backgrounds -->
<div class="bg-base">Base background</div>
<div class="bg-elevated">Elevated background</div>
<div class="bg-surface">Surface background</div>

<!-- Animations -->
<div class="animate-fade-in">Fade in</div>
<div class="animate-slide-up">Slide up</div>
<div class="animate-cyber-pulse">Cyber pulse</div>

<!-- Borders -->
<div class="border-neon">Neon border</div>
<div class="divider">Horizontal divider</div>
<div class="divider-primary">Primary divider</div>
```

---

## Migration Guide

When porting components from inline Tailwind to semantic classes:

1. **Cards**: `bg-gray-800/50 rounded-lg p-6` → `card`
2. **Buttons**: `bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400...` → `btn btn-primary`
3. **Alerts**: `bg-cyan-500/5 border border-cyan-500/20 rounded-lg` → `alert-info`
4. **Titles**: `text-lg font-bold neon-text-cyan uppercase tracking-wider font-mono` → `text-title`
5. **Inputs**: `w-full px-4 py-3 bg-gray-900/50 rounded-lg...` → `input`

## File Structure

```
src/styles/semantic/
├── index.css           # Main entry point
├── _variables.css      # CSS custom properties
├── _typography.css     # Text styles
├── _buttons.css        # Button variants
├── _cards.css          # Cards and alerts
├── _inputs.css         # Form inputs
├── _badges.css         # Status badges
├── _modals.css         # Modal styles
├── _utilities.css      # Animations, effects
└── README.md           # This file
```
