# LogoTray Keyboard Shortcuts & Accessibility

## Keyboard Shortcuts

LogoTray includes several keyboard shortcuts to enhance productivity:

### Global Shortcuts

- **Escape (ESC)** - Hide the popover window
- **⌘Q (Cmd+Q)** - Quit the application
- **⌘K (Cmd+K)** - Focus the search input and select all text
- **⌘⌫ (Cmd+Backspace)** - Clear the search and reset results

### Navigation

- **Tab** - Navigate between interactive elements
- **Shift+Tab** - Navigate backwards between interactive elements
- **Enter** - Activate focused element (buttons, links)

## Accessibility Features

### Screen Reader Support

- All interactive elements have proper ARIA labels
- Search input includes descriptive `aria-label` and `aria-describedby`
- Results section uses `aria-live="polite"` for dynamic updates
- Error messages use `aria-live="assertive"` for immediate attention
- Loading states are announced with `aria-busy`

### Keyboard Navigation

- Full keyboard navigation support throughout the application
- Visible focus indicators on all interactive elements
- Logical tab order following visual layout
- No keyboard traps - users can always navigate away

### Visual Accessibility

- High contrast mode support for users who need it
- Reduced motion support for users with motion sensitivity
- Clear focus indicators with 2px teal outline
- Sufficient color contrast ratios for text and interactive elements
- Smooth transitions that respect user preferences

### Semantic HTML

- Proper use of semantic HTML5 elements (`header`, `main`, `section`, `footer`)
- Heading hierarchy for screen readers
- Descriptive button labels and titles
- Hidden helper text for screen readers

## Testing Accessibility

To test accessibility features:

1. **Keyboard Navigation**: Try navigating the entire app using only Tab, Shift+Tab, and Enter
2. **Screen Reader**: Test with VoiceOver (macOS) or NVDA/JAWS (Windows)
3. **High Contrast**: Enable high contrast mode in system preferences
4. **Reduced Motion**: Enable "Reduce motion" in system accessibility settings

## Best Practices

- Always provide text alternatives for images
- Ensure sufficient color contrast (WCAG AA minimum)
- Support keyboard navigation for all interactive elements
- Provide clear focus indicators
- Respect user preferences for motion and contrast
- Test with actual assistive technologies

## Future Improvements

- Add more granular keyboard shortcuts for logo selection
- Implement arrow key navigation in logo grid
- Add voice control support
- Enhance screen reader announcements for drag operations
- Add customizable keyboard shortcuts
