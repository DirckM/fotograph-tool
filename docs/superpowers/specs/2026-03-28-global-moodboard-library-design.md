# Global Moodboard Library

## Overview

A read-only global moodboard page accessible from the sidebar that displays all moodboard reference images ever imported across every project. Images are automatically categorized based on the stage they were imported from (Model, Environment, Pose, Garment) and can be filtered by category.

## Sidebar Changes

- New "Library" section in the sidebar, positioned between "Projects" and "Tools"
- Contains a single link: "Moodboard" with a grid/layout icon
- Route: `/dashboard/moodboard`
- Active state follows existing sidebar patterns

## Page Layout

### Header
- Title: "Moodboard"
- Subtitle: dynamic count, e.g. "48 images across 6 projects"

### Filter Pills
- Horizontal row of pill-style toggles: `All` | `Model` | `Environment` | `Pose` | `Garment`
- Active pill uses filled/primary style, inactive pills use muted/outline style
- "All" is selected by default
- Clicking a pill filters the grid immediately (client-side filter on already-fetched data)

### Image Grid
- Responsive grid: 4 columns on desktop, 3 on tablet, 2 on mobile
- Each image thumbnail has rounded corners
- Hover: subtle scale-up effect (scale 1.02-1.05 with transition)
- No overlays or badges on hover — just the scale

### Detail Panel
- Clicking an image opens a right-side detail panel (slide-in from right, similar to existing refinement-panel pattern)
- Panel contents:
  - Large image preview
  - Project name (clickable link to that project)
  - Category label (Model / Environment / Pose / Garment)
  - Date added
  - Source indicator (Upload vs Pinterest)
- Clicking outside the panel or clicking a close button dismisses it
- Only one panel open at a time (clicking another image switches the panel content)

## Data Model

### Query
- Table: `project_assets`
- Filter: `asset_type IN ('model_moodboard', 'env_moodboard', 'pose_moodboard', 'garment_image')`
- Scoped to: current authenticated user (`user_id`)
- Join: `projects` table to get `project.name`
- Order: `created_at DESC` (newest first)

### API Route
- `GET /api/moodboard/library`
- Query param: `category` (optional) — values: `all`, `model`, `env`, `pose`, `garment`
- Returns: array of assets with joined project name
- Response shape:
  ```json
  {
    "assets": [
      {
        "id": "uuid",
        "asset_type": "model_moodboard",
        "storage_path": "url-or-null",
        "external_url": "url-or-null",
        "source": "upload|pinterest",
        "created_at": "iso-date",
        "project_id": "uuid",
        "project_name": "Summer Campaign"
      }
    ]
  }
  ```

### Category Mapping
| asset_type | Display Label |
|---|---|
| `model_moodboard` | Model |
| `env_moodboard` | Environment |
| `pose_moodboard` | Pose |
| `garment_image` | Garment |

## Not in Scope
- No reusing/importing images from this view into other projects
- No deleting or managing images from this view
- No text search
- No pagination (fetch all at once; can add pagination later if needed)

## Files to Create/Modify
1. `app/api/moodboard/library/route.ts` — new API route
2. `app/dashboard/moodboard/page.tsx` — new page
3. `components/sidebar.tsx` — add Library section with Moodboard link
