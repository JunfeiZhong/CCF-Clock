# CV Conference Deadlines

A Wallpaper Engine web wallpaper for computer vision conference deadlines.

## Usage

1. Create a new Web wallpaper in Wallpaper Engine.
2. Select this folder's `index.html`.
3. Keep `index.html`, `styles.css`, `app.js`, `conferences.json`, and `project.json` in the same folder.

## Typography

- The interface is English-only.
- All text uses the system `Times New Roman` stack.
- There are no embedded custom font files or font-switching controls.

## Color Theme

- Wallpaper Engine exposes a `Color Theme` property: `Vintage Paper` or `Dark Ink`.
- In a local browser preview, press `L` or `D` to switch themes, or add `?theme=dark` to the URL.

## Automatic Sync

- Wallpaper Engine exposes a `Data Source URL` property.
- Leave it empty to use the packaged `conferences.json`.
- Set it to an HTTPS JSON URL to sync conference data automatically.
- The remote JSON should use the same structure as `conferences.json` and allow browser access.
- If the remote source fails, the page falls back to local `conferences.json`, then the built-in fallback list.
- In a local browser preview, add `?data=https://example.com/conferences.json` to test a remote source.

## Content

- Layout: conference cards only, with the nearest active deadline promoted to the main card.
- Conferences: recent ECCV, ACCV, WACV, BMVC, CVPR, and ICCV milestones.
- Rankings: keeps CORE ranking and CCF ranking.
- Data source: conference information is loaded from the remote URL when provided, otherwise from `conferences.json`.
- Refresh: the page reloads the active data source on startup and again every 6 hours.
- Data policy: announced dates are entered directly; projected dates are marked as estimates.
- Rotation: expired milestones leave the board automatically, and the next cycle is appended as a TBA card.
