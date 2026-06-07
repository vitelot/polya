# Polya's Urn with Innovations

An interactive browser-based visualization of the innovation dynamics model based on a reinforced Polya's urn process.

**Live demo:** https://csh.ac.at/vis/polya/

## What it shows

The simulation implements the model introduced in [Tria et al., *Scientific Reports* 4, 5890 (2014)](http://www.nature.com/srep/2014/140731/srep05890/full/srep05890.html).

The urn starts with a single red ball. At each time step:

1. A ball is drawn at random from the urn. Its color is recorded in the **stream**.
2. **Reinforcement** — `rho` copies of the drawn ball are added back to the urn (entering from the left).
3. **Adjacent possible** — if the drawn color has never appeared in the stream before, `nu + 1` balls with brand-new colors are added to the urn (entering from the right), expanding the space of future possibilities.

The pie chart on the right tracks the frequency distribution of colors seen so far in the stream.

## Controls

| Control | Description |
|---------|-------------|
| `rho` | Number of copies added on each draw (reinforcement strength). Range: 1–6. Default: 2. |
| `nu` | Number of new-color balls added on a novel draw (adjacent possible size). Range: −1–6. Default: 1. |
| `rate` | Milliseconds between steps (lower = faster). Range: 200–2000. Default: 800. |
| Pause / click canvas | Pause or resume the simulation. |
| Restart | Reset the urn to its initial state. |

## Running locally

No build step needed — open `index.html` directly in a browser:

```bash
open index.html
# or
python3 -m http.server
```

Requires an internet connection to load D3.js v3 and Google Fonts from their CDNs.

## Files

```
index.html   — page layout and UI controls
main.js      — simulation logic and D3 rendering
inno.css     — styles
```

## Reference

Tria, F., Loreto, V., Servedio, V. D. P., & Strogatz, S. H. (2014).  
*The dynamics of correlated novelties.*  
Scientific Reports, 4, 5890. https://doi.org/10.1038/srep05890

## Author

VDP Servedio — CSH Vienna
