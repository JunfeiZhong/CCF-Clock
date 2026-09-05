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

## Data Update Draft

- Requires Node.js 18 or newer.
- Run `node scripts/update-from-bibby.mjs` to generate `conferences.generated.json`.
- The script tries Bibby's CV Clock first, then falls back to `ccfddl` if Bibby is blocked or unavailable.
- Treat the result as a review draft, not an official API feed.
- The script keeps only ACCV, BMVC, CVPR, ECCV, ICCV, ICDAR, ICIP, and WACV entries.
- It merges imported entries with the current local list, so local-only cards such as conference dates are preserved.
- Run `node scripts/update-from-bibby.mjs --apply` to update `conferences.json` directly.
- Review `conferences.generated.json` before replacing `conferences.json`.
- After publishing the reviewed JSON to GitHub Pages, Wallpaper Engine will pick it up through `Data Source URL`.

## GitHub Automation

- `.github/workflows/update-conferences.yml` runs the conference updater every day.
- Default mode opens a pull request when `conferences.json` changes.
- To publish with no review step, set the repository variable `CONFERENCE_UPDATE_MODE` to `publish`.
- Manual workflow runs can also choose `pull-request` or `publish`.
- If every upstream source is unavailable, the workflow keeps the current `conferences.json` and exits without changes.
- GitHub Pages then serves the updated `conferences.json`, and Wallpaper Engine syncs it through `Data Source URL`.

## Content

- Layout: conference cards only, with the nearest active deadline promoted to the main card.
- Conferences: recent ECCV, ACCV, WACV, BMVC, CVPR, ICCV, ICDAR, and ICIP milestones.
- Rankings: keeps CORE ranking and CCF ranking.
- Data source: conference information is loaded from the remote URL when provided, otherwise from `conferences.json`.
- Refresh: the page reloads the active data source on startup and again every 6 hours.
- Data policy: announced dates are entered directly; projected dates are marked as estimates.
- Rotation: expired milestones leave the board automatically, and the next cycle is appended as a TBA card.
