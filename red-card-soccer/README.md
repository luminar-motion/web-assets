# RED CARD — Arcade Soccer

Gioco di calcio arcade 2D/isometrico ispirato a **Red Card Soccer** (Midway): tackle violenti, arbitro pigro, e quando fischia puoi prenderlo a calci, pugni e scivolate.

## Avvio

```bash
npm install
npm run dev
```

Poi apri l’URL di Vite (di solito `http://localhost:5173`).

## Controlli

| Tasto | Azione |
|-------|--------|
| WASD / frecce | Muovi |
| J / Spazio | Tiro / passaggio (e calcio all’arbitro) |
| K | Scivolata devastante |
| L | Pugno / gomito |
| Tab | Cambia giocatore (squadra Blu) |

## Meccaniche

- **Calcio sporco**: scivolate e pugni stordiscono e feriscono gli avversari.
- **Arbitro raro**: solo una frazione dei falli gravi richiama l’arbitro (`REF_INTERVENE_CHANCE`).
- **Rissa con l’arbitro**: quando interviene, avvicinati e usa K / L / J per stenderlo — la partita riprende lo stesso.
