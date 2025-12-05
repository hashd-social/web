# HASHD Style Guide

A cyberpunk-inspired design system for secure, decentralized communication.

## Design Philosophy

HASHD embraces a **cyberpunk aesthetic** with clean, modern functionality. The design balances futuristic visual elements with practical usability, creating an interface that feels both cutting-edge and accessible.

## Color Palette

### Primary Colors
```css
/* Dark Base Colors */
--bg-primary: #0a0e27     /* Deep space blue */
--bg-secondary: #111827   /* Charcoal gray */
--bg-tertiary: #1a1f3a    /* Muted navy */

/* Neon Accents */
--neon-cyan: #00ffff      /* Electric cyan */
--neon-magenta: #ff00ff   /* Hot magenta */
--neon-green: #00ff41     /* Matrix green */
--neon-purple: #a855f7    /* Violet purple */
--neon-blue: #3b82f6      /* Electric blue */
```

### Text Colors
```css
--text-primary: #e0e7ff   /* Light lavender */
--text-secondary: #94a3b8 /* Muted gray */
--text-muted: #64748b     /* Subtle gray */
```

### Usage Guidelines
- **Primary backgrounds** for main containers and layouts
- **Neon accents** for interactive elements, highlights, and CTAs
- **Text hierarchy** using the three text color levels
- **Cyan** for primary actions and links
- **Purple** for secondary actions and highlights
- **Green** for success states and confirmations

## Typography

### Font Families
```css
/* Primary Interface */
font-family: 'Inter', system-ui, sans-serif;

/* Code & Technical */
font-family: 'JetBrains Mono', monospace;

/* Headers & Branding */
font-family: 'Orbitron', sans-serif;

/* UI Labels */
font-family: 'Rajdhani', sans-serif;
```

### Type Scale
- **Headings**: Use `Orbitron` for main headings, `font-bold` or `font-black`
- **Body Text**: Use `Inter` for readable content, `font-normal` to `font-medium`
- **Code/Technical**: Use `JetBrains Mono` for addresses, hashes, technical data
- **UI Labels**: Use `Rajdhani` for buttons, badges, and interface labels

### Examples
```tsx
// Main heading
<h1 className="text-4xl font-black font-orbitron text-cyan-400">

// Section heading  
<h2 className="text-xl font-bold font-mono text-cyan-400">

// Body text
<p className="text-gray-300 font-inter">

// Technical data
<code className="font-mono text-green-400">

// Button text
<span className="font-rajdhani uppercase tracking-wider">
```

## Component Standards

### Buttons

#### Primary Button (Cyber Button)
```tsx
<button className="px-12 py-4 cyber-button relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden">
  <Icon className="w-6 h-6" />
  BUTTON TEXT
</button>
```

#### Secondary Button
```tsx
<button className="px-6 py-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-colors">
  Secondary Action
</button>
```

#### Ghost Button
```tsx
<button className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-cyan-400">
  <Icon className="w-5 h-5" />
</button>
```

### Cards & Containers

#### Glass Card
```tsx
<div className="glass-card neon-border">
  <!-- Content -->
</div>
```

#### Modal Container
```tsx
<div className="bg-gray-900 rounded-lg border border-cyan-500/30 shadow-2xl">
  <!-- Modal content -->
</div>
```

### Form Elements

#### Input Field
```tsx
<input 
  className="w-full bg-gray-800/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-gray-200 placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
  placeholder="Enter value..."
/>
```

#### Select Dropdown
```tsx
<select className="bg-gray-800 border border-cyan-500/30 rounded-lg px-4 py-2 text-gray-200 focus:border-cyan-400">
  <option>Option 1</option>
</select>
```

## Layout Patterns

### Page Structure
```tsx
<div className="min-h-screen cyber-bg">
  <Header />
  <main className="container mx-auto px-4 py-8">
    <!-- Page content -->
  </main>
  <Footer />
</div>
```

### Grid Layouts
```tsx
// Two-column layout
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

// Three-column layout  
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Stats grid
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
```

## Visual Effects

### Glow Effects
```css
/* Subtle glow for interactive elements */
.glow-cyan {
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

/* Intense glow for focus states */
.glow-intense {
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
}
```

### Animations
```css
/* Fade in animation */
.animate-fade-in {
  animation: fadeIn 0.5s ease-in-out;
}

/* Slide up animation */
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

/* Pulse for loading states */
.animate-pulse-slow {
  animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

## Icon Usage

### Icon Library
Primary: **Lucide React** icons

### Icon Sizing
- **Small UI**: `w-4 h-4` (16px)
- **Standard**: `w-5 h-5` (20px) 
- **Large buttons**: `w-6 h-6` (24px)
- **Headers**: `w-8 h-8` (32px)

### Icon Colors
```tsx
// Primary icons
<Icon className="w-5 h-5 text-cyan-400" />

// Secondary icons  
<Icon className="w-5 h-5 text-purple-400" />

// Muted icons
<Icon className="w-5 h-5 text-gray-500" />

// Success/confirmation
<Icon className="w-5 h-5 text-green-400" />
```

## Spacing & Sizing

### Container Widths
- **Full width**: `w-full`
- **Constrained**: `max-w-4xl mx-auto`
- **Wide**: `max-w-6xl mx-auto`
- **Narrow**: `max-w-2xl mx-auto`

### Padding Scale
- **Tight**: `p-2` (8px)
- **Standard**: `p-4` (16px)
- **Comfortable**: `p-6` (24px)
- **Spacious**: `p-8` (32px)

### Gap Scale
- **Tight**: `gap-2` (8px)
- **Standard**: `gap-4` (16px)
- **Comfortable**: `gap-6` (24px)
- **Wide**: `gap-8` (32px)

## Responsive Design

### Breakpoints
```css
/* Mobile first approach */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small desktops */
xl: 1280px  /* Large desktops */
```

### Common Responsive Patterns
```tsx
// Responsive text sizing
<h1 className="text-2xl md:text-4xl lg:text-6xl">

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// Responsive padding
<div className="p-4 md:p-6 lg:p-8">

// Responsive visibility
<div className="hidden md:block">
```

## Accessibility

### Focus States
All interactive elements must have visible focus indicators:
```css
focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900
```

### Color Contrast
- Ensure minimum 4.5:1 contrast ratio for normal text
- Ensure minimum 3:1 contrast ratio for large text
- Use semantic colors for states (success, warning, error)

### ARIA Labels
```tsx
// Buttons with icons only
<button aria-label="Close modal">
  <X className="w-5 h-5" />
</button>

// Loading states
<div aria-live="polite" aria-busy="true">
  Loading...
</div>
```

## Best Practices

### Component Composition
- Use consistent spacing between elements
- Group related actions together
- Maintain visual hierarchy with typography and color
- Use loading states for async operations
- Provide clear feedback for user actions

### Performance
- Use CSS classes over inline styles
- Leverage Tailwind's utility classes
- Optimize images and use appropriate formats
- Implement proper loading states

### Consistency
- Follow established patterns for similar components
- Use the defined color palette consistently
- Maintain consistent spacing and sizing
- Apply hover and focus states uniformly

---

*This style guide ensures HASHD maintains its distinctive cyberpunk aesthetic while providing a consistent, accessible user experience across all interfaces.*
