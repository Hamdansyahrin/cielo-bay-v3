# Cielo Bay — steal cars, run the fixer's missions, outrun the heat
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Hamdansyahrin/cielo-bay-v3/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Hamdansyahrin/cielo-bay-v3/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Cielo Bay** is an original 2.5D top-down open-world crime game built for the
[make.fun GTA 6 bounty](https://make.fun/bounty/gta6-01). You wash up broke in a
sun-soaked coastal city; fixer **Mara Voss** has five jobs, a chop shop by the
port, and no patience. Everything — city, characters, vehicles, names, story,
art and sound — is original to this game.

## Play it

Serve the `game/` folder with any static file server and open it in desktop
Chrome, for example:

```
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

No build step, no network requests: plain HTML, canvas and JavaScript, with
WebAudio-synthesised sound (no audio files).

## The city

One seamless city in three districts — **Downtown** towers with lit windows and
long sunset shadows, the **Beachfront** with its palm-lined shore, animated
water and wooden pier, and the **Port** with warehouses and the chop shop.
Named streets (Palmera Avenue, Cielo Boulevard, Sunset Row, Coral Avenue,
Harbor Line…), sidewalks, Voss Plaza park, parked cars, AI traffic with
headlights, and pedestrians who stroll — and flee when crimes happen near them.

## Controls

- **WASD / arrows** — move on foot, drive in a car
- **Shift** — run · **Mouse** — aim · **Click** — fire the pistol
- **Q / right-click / F (on foot)** — melee swing
- **E / F** — enter or exit any car (yes, any car)
- **Space** — handbrake drift while driving · **P** — pause · **Enter** — start / continue

## Wanted system

Crimes only raise your heat when someone *sees* them — a pedestrian or a
cruiser with line of sight. One to five stars bring faster, smarter pursuit:
cruisers spawn far away at the road edges, chase your **last known position**,
and give up after about eight seconds unseen. Roadblocks appear at four stars.
Heat decays one star at a time, only while nobody has eyes on you. Get cornered
on foot and you are **BUSTED**; run out of health and you are **WASTED**.

## The five jobs (Mara Voss)

1. **Hot Wheels** (+$500) — lift the marked amber coupe, deliver it to the chop shop.
2. **Courier Run** (+$750) — four checkpoints across the bay, against the clock.
3. **Heat Check** (+$900) — draw exactly 3 stars, survive the chase, lose the heat.
4. **Pier Pressure** (+$1,200) — clear the five-strong rival crew holding Cielo Pier.
5. **The Vault Van** (+$2,500) — take the armored van at the port, survive 4 stars, deliver it.

After job 5 the bay is yours: free roam.

## HUD, save, sound

Full HUD: minimap (roads, player arrow, flashing police blips, mission
marker), wanted stars, cash, health, a vehicle speedometer and damage meter,
an objective banner kept at the top of the screen, phone-style mission
briefings from Mara, and short toasts. Progress (cash, mission, position)
saves to `localStorage` — press **Enter** to continue, **N** for a new game.
Sound is 100% WebAudio synth: engine hum that follows your speed, two-tone
sirens, gunshots, crashes, melee thumps and cash-register pickups.
