# Custom Hex Grid Captcha Setup

This guide explains how to set up images for the custom hex grid captcha system.

## Directory Structure

Create the following directory in your `public` folder:

```
public/
└── captcha-images/
    ├── CC00_cars_street_scene.jpg
    ├── 0CC0_cars_parking_lot.jpg
    ├── 000F_cars_highway_view.jpg
    ├── 8421_cars_intersection.jpg
    ├── 6666_cars_dealership.jpg
    ├── 8000_lights_intersection_1.jpg
    ├── 1000_lights_intersection_2.jpg
    ├── 0080_lights_street_1.jpg
    ├── 0001_lights_crosswalk.jpg
    ├── 4000_signs_residential_street.jpg
    ├── 0008_signs_school_zone.jpg
    └── 0800_signs_corner_view.jpg
    └── 0800_dat-boi_frog_unicycly.gif
```

## Naming Convention

The filename structure is: `{4-digit-hex}_{challenge}_{description}.{extension}`

- **4-digit-hex**: A hexadecimal string (0000-FFFF) representing the 4x4 grid
- **challenge**: The challenge category (e.g., "cars", "lights", "signs")
- **description**: A descriptive name for the specific scene
- **extension**: Image file extension (.jpg, .png, .webp, .gif)

## Hex to Binary Grid Mapping

The 4-digit hex prefix converts to 16-bit binary, mapping to a 4x4 grid as follows:

```
Hex:      CC00
Binary:   1100110000000000
Position: 0  1  2  3
         4  5  6  7
         8  9 10 11
        12 13 14 15

Grid:     [1][1][0][0]
         [1][1][0][0]
         [0][0][0][0]
         [0][0][0][0]
```

- **1** = This grid square contains the target object (cars, lights, etc.)
- **0** = This grid square does NOT contain the target object

## Common Hex Patterns and Their Meanings

Here are some common hex patterns and what they represent in the 4x4 grid:

- **F000** = Top row only (1111000000000000)
- **000F** = Bottom row only (0000000000001111)
- **8888** = Left column only (1000100010001000)
- **1111** = Right column only (0001000100010001)
- **CC00** = Top-left 2x2 square (1100110000000000)
- **0033** = Top-right 2x2 square (0000000000110011)
- **C0C0** = Left two columns (1100000011000000)
- **0303** = Right two columns (0000001100000011)
- **6666** = Middle two columns (0110011001100110)
- **9999** = Diagonal pattern (1001100110011001)

## How It Works

1. The captcha loads a single image and overlays a 4x4 grid
2. Users must click on ALL grid squares that contain the target object
3. The system extracts the hex prefix and converts it to binary
4. Success requires selecting exactly the squares marked with "1" in the binary pattern

## Creating Images

### Step 1: Choose Your Scene
Take or find an image that contains your target objects (cars, traffic lights, stop signs, etc.)

### Step 2: Map the Grid
1. Divide your image mentally into a 4x4 grid (16 squares)
2. Identify which squares contain your target objects
3. Create a 16-bit binary string where:
   - Position 0 = top-left square
   - Position 3 = top-right square  
   - Position 12 = bottom-left square
   - Position 15 = bottom-right square

### Step 3: Convert to Hex and Name the File
Example: If cars appear in the top-left 2x2 area:
- Binary: `1100110000000000`
- Hex: `CC00`
- Filename: `CC00_cars_street_scene.jpg`

## Binary to Hex Conversion Guide

| Binary (4-bit) | Hex | Binary (4-bit) | Hex |
|----------------|-----|----------------|-----|
| 0000           | 0   | 1000           | 8   |
| 0001           | 1   | 1001           | 9   |
| 0010           | 2   | 1010           | A   |
| 0011           | 3   | 1011           | B   |
| 0100           | 4   | 1100           | C   |
| 0101           | 5   | 1101           | D   |
| 0110           | 6   | 1110           | E   |
| 0111           | 7   | 1111           | F   |

### Example Conversions:
- `1100110000000000` → `CC00` (split into 1100,1100,0000,0000 → C,C,0,0)
- `1111000000000000` → `F000` (top row filled)
- `0000000000001111` → `000F` (bottom row filled)
- `1000100010001000` → `8888` (left column filled)

## Image Requirements

1. **Resolution**: Recommended 512x512 pixels or 640x480 pixels
2. **Format**: JPEG, PNG, or WebP
3. **Content**: Should contain the target objects in the grid positions specified by the hex prefix
4. **Quality**: Clear, well-lit images where the target objects are easily identifiable

## Testing

After adding images, the captcha component will:
1. Extract the hex prefix from the filename (e.g., "CC00" from "CC00_cars_street.jpg")
2. Convert hex to binary (CC00 → 1100110000000000)
3. Map the binary to the 4x4 grid for validation
4. Check user selections against the pattern

## Example Grid Analysis

For an image of cars in a parking lot where cars are visible in the top-left area:

```
Visual Grid:  [Car][Car][ ][ ]
             [Car][Car][ ][ ]
             [ ][ ][ ][ ]
             [ ][ ][ ][ ]

Binary:      1100110000000000
Hex:         CC00
Filename:    CC00_cars_parking_lot.jpg
```

## Examples

### Cars in Top Row
```
[🚗][🚗][🚗][🚗]  →  1111000000000000_cars_highway_traffic.jpg
[ ][ ][ ][ ]
[ ][ ][ ][ ]
[ ][ ][ ][ ]
```

### Traffic Light in Center
```
[ ][ ][ ][ ]        →  0000010000000000_lights_intersection.jpg
[ ][🚦][ ][ ]
[ ][ ][ ][ ]
[ ][ ][ ][ ]
```

### Scattered Cars
```
[🚗][ ][ ][🚗]     →  1001000000001001_cars_parking_lot.jpg
[ ][ ][ ][ ]
[ ][ ][ ][ ]
[🚗][ ][ ][🚗]
```

## Challenge Types

### Cars Challenge
- Target: Any type of car, truck, or automobile
- Exclude: Motorcycles, buses, bicycles

### Lights Challenge  
- Target: Traffic lights, street lights
- Exclude: Building lights, car headlights

### Signs Challenge
- Target: Traffic signs, road signs
- Exclude: Building signs, advertisements

## Image Requirements

- **Size**: Minimum 400x400 pixels for clear grid visibility
- **Format**: JPG, PNG, or WebP
- **Quality**: High enough to clearly distinguish objects in each grid square
- **Content**: Objects should be clearly visible and recognizable

## Testing Your Images

1. Load your image in the captcha
2. Mentally divide it into a 4x4 grid
3. Check if the target objects are clearly visible in the marked squares
4. Ensure no target objects appear in unmarked squares

## Fallback Behavior

If images fail to load, the system will:
1. Show a loading spinner
2. Automatically try to load a different image
3. Display error message if no images can be loaded

## Adding New Challenges

To add a new challenge type:
1. Create images with your new challenge name (e.g., "animals")
2. Update the `availableImages` array in `CustomCaptcha.js`
3. Set the challenge prop: `<CustomCaptcha challenge="animals" />`
