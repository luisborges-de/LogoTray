# Requirements Document

## Introduction

LogoBuddy is a native macOS menubar application that provides instant access to company and institution logos through a clean, glassmorphic popover interface. Users can search for logos by typing company names or pasting domains, view results from multiple API sources, and drag logos directly into other applications like PowerPoint, Word, or Figma. The app emphasizes speed, simplicity, and native macOS integration with a modern visual design.

## Requirements

### Requirement 1

**User Story:** As a designer or content creator, I want to quickly access company logos from the menubar, so that I can efficiently find and use logos without interrupting my workflow.

#### Acceptance Criteria

1. WHEN the user clicks the menubar icon THEN the system SHALL display a small popover window below the menubar
2. WHEN the popover opens THEN the system SHALL automatically focus the search input field
3. WHEN the user clicks outside the popover THEN the system SHALL close the popover window
4. WHEN the system starts THEN the menubar icon SHALL be visible and accessible in the macOS menubar

### Requirement 2

**User Story:** As a user, I want to search for logos by typing company names or pasting domains, so that I can find the logos I need using familiar input methods.

#### Acceptance Criteria

1. WHEN the user types in the search field THEN the system SHALL accept text input for company names
2. WHEN the user pastes a domain URL THEN the system SHALL extract the company name from the domain
3. WHEN the user presses Enter or pauses typing THEN the system SHALL initiate a logo search
4. WHEN the search field is empty THEN the system SHALL display placeholder text indicating search functionality

### Requirement 3

**User Story:** As a user, I want to see logo results from multiple reliable sources, so that I have the best chance of finding high-quality, transparent logos.

#### Acceptance Criteria

1. WHEN a search is performed THEN the system SHALL query Logo.dev as the primary source
2. WHEN a search is performed THEN the system SHALL query Brandfetch API as a secondary source
3. WHEN a search is performed THEN the system SHALL query API Ninjas as an additional source
4. WHEN searching for universities or NGOs THEN the system SHALL query Wikidata/Wikimedia
5. WHEN other sources fail THEN the system SHALL use IconHorse as a fallback source
6. WHEN results are available THEN the system SHALL prioritize transparent PNG formats
7. WHEN multiple sources return results THEN the system SHALL deduplicate similar logos

### Requirement 4

**User Story:** As a user, I want to see logo results in a clean grid layout, so that I can quickly browse and select the logo I need.

#### Acceptance Criteria

1. WHEN search results are available THEN the system SHALL display logos in a grid layout
2. WHEN displaying logos THEN each logo SHALL be presented as a draggable card
3. WHEN hovering over a logo card THEN the system SHALL provide visual feedback
4. WHEN no results are found THEN the system SHALL display an appropriate message
5. WHEN results are loading THEN the system SHALL show a loading indicator

### Requirement 5

**User Story:** As a user, I want to drag logos directly into other applications, so that I can seamlessly integrate logos into my work without manual file operations.

#### Acceptance Criteria

1. WHEN the user drags a logo card THEN the system SHALL initiate a drag operation with the logo file
2. WHEN dragging to external applications THEN the system SHALL provide the logo as a file that can be dropped
3. WHEN dragging occurs THEN the system SHALL show appropriate drag feedback
4. WHEN the drag operation completes THEN the system SHALL maintain the popover state

### Requirement 6

**User Story:** As a user, I want to copy or save logos with a right-click, so that I have alternative ways to use the logos beyond dragging.

#### Acceptance Criteria

1. WHEN the user right-clicks a logo THEN the system SHALL display a context menu
2. WHEN the user selects "Copy" THEN the system SHALL copy the logo to the clipboard
3. WHEN the user selects "Save" THEN the system SHALL open a save dialog for the logo file
4. WHEN copying or saving THEN the system SHALL handle the operation without closing the popover

### Requirement 7

**User Story:** As a user, I want my search results to load instantly on repeated searches, so that I can work efficiently without waiting for network requests.

#### Acceptance Criteria

1. WHEN a search is performed THEN the system SHALL check local cache first
2. WHEN cached results exist and are recent THEN the system SHALL display cached results immediately
3. WHEN cached results are stale or missing THEN the system SHALL fetch new results and update cache
4. WHEN the app starts THEN the system SHALL initialize the local cache system
5. WHEN cache storage exceeds limits THEN the system SHALL remove oldest entries

### Requirement 8

**User Story:** As a macOS user, I want the app to have a modern glassmorphic design that adapts to system appearance, so that it feels native and visually appealing.

#### Acceptance Criteria

1. WHEN the popover displays THEN the system SHALL use glassmorphic styling with subtle blur effects
2. WHEN the system is in light mode THEN the app SHALL adapt to light appearance
3. WHEN the system is in dark mode THEN the app SHALL adapt to dark appearance
4. WHEN displaying UI elements THEN the system SHALL use rounded corners and soft transitions
5. WHEN showing interactive elements THEN the system SHALL use purple accent colors
6. WHEN the popover appears THEN the system SHALL use smooth animation transitions

### Requirement 9

**User Story:** As a user, I want to see which sources provided the logo results, so that I can understand the origin and reliability of the logos.

#### Acceptance Criteria

1. WHEN displaying search results THEN the system SHALL show a source attribution line at the bottom
2. WHEN results come from multiple sources THEN the system SHALL list all contributing sources
3. WHEN hovering over a specific logo THEN the system SHALL indicate which source provided that logo
4. WHEN no results are found THEN the system SHALL indicate which sources were searched

### Requirement 10

**User Story:** As a user, I want the app to stay minimal and focused, so that I can complete my logo search task quickly without distractions.

#### Acceptance Criteria

1. WHEN the popover opens THEN the system SHALL display only essential UI elements
2. WHEN showing the interface THEN the system SHALL avoid unnecessary text or controls
3. WHEN the user completes an action THEN the system SHALL provide subtle feedback without overwhelming the interface
4. WHEN displaying the popover THEN the system SHALL maintain a compact size appropriate for the menubar context