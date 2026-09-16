import Svg, { Path, Circle, Line, Polygon, G, Text as SvgText } from 'react-native-svg';

// Original pictogram per coin type -- simple single-color line/fill glyphs,
// drawn on a 24x24 grid. Not modeled on any specific product's artwork.
const ICONS = {
  birdie: (p) => (
    <G {...p}>
      <Path d="M3 14c2-4 6-6 10-5 2.5.5 4 2 5 4-1.5.5-3 .3-4-.5.5 1.5.2 3-1 4-1-1.5-2.7-2-4.3-1.5C7 15.7 5 15.5 3 14z" />
      <Circle cx="15.5" cy="10.3" r="0.9" fill="none" stroke={p.color} strokeWidth="1.4" />
    </G>
  ),
  eagle: (p) => (
    <G {...p}>
      <Path d="M12 8c-3.5-3-8-3-10.5-1.2 2 .3 3.5 1.2 4.5 2.7-1.7.2-3 1-4 2.3 2 .6 3.8.4 5.3-.7-.2 1.7.4 3.2 1.7 4.4 1.3-1.2 1.9-2.7 1.7-4.4 1.5 1.1 3.3 1.3 5.3.7-1-1.3-2.3-2.1-4-2.3 1-1.5 2.5-2.4 4.5-2.7C20 5 15.5 5 12 8z" />
    </G>
  ),
  one_putt: (p) => (
    <G {...p}>
      <Line x1="7" y1="3" x2="7" y2="19" strokeWidth="1.6" stroke={p.color} fill="none" />
      <Path d="M7 3l8 3-8 3z" />
      <Path d="M3 19h13" strokeWidth="1.6" stroke={p.color} fill="none" strokeLinecap="round" />
      <Circle cx="16.5" cy="15.5" r="2.2" fill="none" stroke={p.color} strokeWidth="1.4" />
      <Path d="M16.5 13.3v-1M18.1 14.3l.8-.6M18.1 17.7l.8.6M14.9 14.3l-.8-.6M14.9 17.7l-.8.6" strokeWidth="1.1" stroke={p.color} strokeLinecap="round" fill="none" />
    </G>
  ),
  three_pars_in_row: (p) => (
    <G {...p}>
      <Line x1="4" y1="5" x2="4" y2="19" strokeWidth="1.5" stroke={p.color} fill="none" />
      <Path d="M4 5l5 2-5 2z" />
      <Line x1="12" y1="5" x2="12" y2="19" strokeWidth="1.5" stroke={p.color} fill="none" />
      <Path d="M12 5l5 2-5 2z" />
      <Line x1="20" y1="5" x2="20" y2="19" strokeWidth="1.5" stroke={p.color} fill="none" />
      <Path d="M20 5l3 2-3 2z" />
      <Path d="M2 19h20" strokeWidth="1.4" stroke={p.color} fill="none" strokeLinecap="round" />
    </G>
  ),
  sand_save: (p) => (
    <G {...p}>
      <Path d="M2 17c3-2.5 17-2.5 20 0" fill="none" stroke={p.color} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M4.5 17c2-1.4 13-1.4 15 0" fill="none" stroke={p.color} strokeWidth="1.2" strokeLinecap="round" />
      <Circle cx="12" cy="8.5" r="2.2" />
      <Path d="M9.5 10.5c-2 1-2.8 2.3-2.8 3.6" fill="none" stroke={p.color} strokeWidth="1.3" strokeLinecap="round" />
    </G>
  ),
  chip_in: (p) => (
    <G {...p}>
      <Path d="M3 18c4-9 9-11 11-11" fill="none" stroke={p.color} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="0.5,3.2" />
      <Circle cx="4.5" cy="16.3" r="1.6" />
      <Line x1="18" y1="4" x2="18" y2="16" strokeWidth="1.5" stroke={p.color} fill="none" />
      <Path d="M18 4l6 2.4-6 2.4z" />
      <Circle cx="18" cy="17" r="1.6" fill="none" stroke={p.color} strokeWidth="1.4" />
    </G>
  ),
  lowest_score: (p) => (
    <G {...p}>
      <Circle cx="12" cy="12" r="9.5" fill="none" stroke={p.color} strokeWidth="1.6" />
      <Path d="M12 6.5v9M8 12l4 4 4-4" fill="none" stroke={p.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  wild_card: (p) => (
    <G {...p}>
      <Polygon points="12,2.5 14.7,9 21.5,9 16,13.2 18,20 12,15.8 6,20 8,13.2 2.5,9 9.3,9" />
    </G>
  ),
  putt_off: (p) => (
    <G {...p}>
      <Line x1="4" y1="3" x2="16" y2="15" strokeWidth="1.6" stroke={p.color} fill="none" strokeLinecap="round" />
      <Path d="M4 3l-1.5 1.5L14 16l1.5-1.5z" />
      <Line x1="20" y1="3" x2="8" y2="15" strokeWidth="1.6" stroke={p.color} fill="none" strokeLinecap="round" />
      <Path d="M20 3l1.5 1.5L10 16l-1.5-1.5z" />
      <Circle cx="12" cy="19.5" r="1.8" />
    </G>
  ),
  par_tee: (p) => (
    <G {...p}>
      <Circle cx="12" cy="6" r="3" />
      <Path d="M9 12h6l-1.3 8h-3.4z" />
    </G>
  ),
  seven: (p) => (
    <G {...p}>
      <Path
        d="M3 4h8v3l-4.5 13h-3l4-13h-4.5z"
      />
    </G>
  ),
  three_putt: (p) => (
    <G {...p}>
      <Circle cx="18.5" cy="12" r="2.3" fill="none" stroke={p.color} strokeWidth="1.5" />
      <Circle cx="5" cy="7" r="1.6" />
      <Circle cx="8.5" cy="14" r="1.6" />
      <Circle cx="13" cy="10.5" r="1.6" />
      <Path d="M5 7c2 2 3.2 4.4 3.5 7M8.5 14c1.5-1 3-2.2 4.5-3.5" fill="none" stroke={p.color} strokeWidth="1.1" strokeDasharray="1.6,1.6" strokeLinecap="round" />
    </G>
  ),
  sand: (p) => (
    <G {...p}>
      <Path d="M2 16.5c3-2.2 17-2.2 20 0" fill="none" stroke={p.color} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M4.5 19.5c2-1.2 13-1.2 15 0" fill="none" stroke={p.color} strokeWidth="1.3" strokeLinecap="round" />
      <Circle cx="12" cy="14.5" r="2.1" />
    </G>
  ),
  tree: (p) => (
    <G {...p}>
      <Polygon points="12,2 17.5,10.5 14.3,10.5 18.5,16 5.5,16 9.7,10.5 6.5,10.5" />
      <Path d="M12 16v6" strokeWidth="1.8" stroke={p.color} fill="none" strokeLinecap="round" />
    </G>
  ),
  man_made: (p) => (
    <G {...p}>
      <Circle cx="12" cy="12" r="9" fill="none" stroke={p.color} strokeWidth="1.6" />
      <Line x1="6" y1="9" x2="18" y2="9" strokeWidth="1.3" stroke={p.color} strokeLinecap="round" />
      <Line x1="6" y1="12" x2="18" y2="12" strokeWidth="1.3" stroke={p.color} strokeLinecap="round" />
      <Line x1="6" y1="15" x2="18" y2="15" strokeWidth="1.3" stroke={p.color} strokeLinecap="round" />
    </G>
  ),
  out_of_bounds: (p) => (
    <G {...p}>
      <Line x1="6" y1="2" x2="6" y2="21" strokeWidth="1.6" stroke={p.color} fill="none" strokeLinecap="round" />
      <Path d="M6 3h11l-2.3 3.2L17 9.4H6z" />
    </G>
  ),
  water: (p) => (
    <G {...p}>
      <Path d="M12 2c4 5 7 9 7 12.5a7 7 0 1 1-14 0C5 11 8 7 12 2z" />
    </G>
  ),
  score_8: (p) => (
    <G {...p}>
      <Circle cx="12" cy="12" r="9.5" />
      <Circle cx="12" cy="12" r="5.2" fill={p.bg || '#fff'} />
      <SvgText
        x="12"
        y="15.2"
        fontSize="7"
        fontWeight="bold"
        fill={p.color}
        stroke="none"
        textAnchor="middle"
      >
        8
      </SvgText>
    </G>
  ),
  highest_score: (p) => (
    <G {...p}>
      <Circle cx="12" cy="12" r="9.5" fill="none" stroke={p.color} strokeWidth="1.6" />
      <Path d="M12 17.5v-9M8 12l4-4 4 4" fill="none" stroke={p.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  skull: (p) => (
    <G {...p}>
      <Path d="M12 2.5c-4.1 0-7 3-7 6.8 0 2.3 1.1 3.9 2.6 5V17h2v-1.6h1.1V17h2.6v-1.6H14V17h2v-2.7c1.5-1.1 2.6-2.7 2.6-5 0-3.8-2.9-6.8-7.6-6.8z" />
      <Circle cx="9" cy="9.3" r="1.5" fill={p.bg || '#fff'} />
      <Circle cx="15" cy="9.3" r="1.5" fill={p.bg || '#fff'} />
      <Path d="M9.5 19.5h5l-1 2h-3z" />
    </G>
  ),
  beer: (p) => (
    <G {...p}>
      <Path d="M6 8h9v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" fill="none" stroke={p.color} strokeWidth="1.6" />
      <Path d="M15 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" fill="none" stroke={p.color} strokeWidth="1.5" />
      <Path d="M6.5 8c-.6-1.6.3-2.6 1-3.3-.2 1 .3 1.4.9.9.2 1 1 1.2 1.5.5.1 1 1 1.3 1.7.7-.1 1.3.6 1.8 1.3 1.2H6.5z" />
      <Line x1="8" y1="11.5" x2="13" y2="11.5" strokeWidth="1.1" stroke={p.color} strokeLinecap="round" opacity="0.6" />
      <Line x1="8" y1="14.5" x2="13" y2="14.5" strokeWidth="1.1" stroke={p.color} strokeLinecap="round" opacity="0.6" />
    </G>
  ),
  grave_digger: (p) => (
    <G {...p}>
      <Path d="M7 21V11a5 5 0 0 1 10 0v10z" />
      <Path d="M9.3 12.2h5.4M12 9.6v5.2" stroke={p.bg || '#fff'} strokeWidth="1.3" strokeLinecap="round" />
    </G>
  ),
  worm_burner: (p) => (
    <G {...p}>
      <Path d="M2 15c1.5-2.5 3.5-2.5 5 0s3.5 2.5 5 0 3.5-2.5 5 0 3.5 2.5 5 0" fill="none" stroke={p.color} strokeWidth="1.7" strokeLinecap="round" />
      <Circle cx="19" cy="8" r="2" />
    </G>
  ),
  lost_ball: (p) => (
    <G {...p}>
      <Circle cx="10" cy="10" r="6.5" fill="none" stroke={p.color} strokeWidth="1.8" />
      <Circle cx="10" cy="10" r="1.3" />
      <Line x1="14.6" y1="14.6" x2="20.5" y2="20.5" strokeWidth="2.2" stroke={p.color} strokeLinecap="round" />
    </G>
  ),
};

export default function CoinIcon({ coinKey, color, size = 30, background }) {
  const render = ICONS[coinKey];
  if (!render) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {render({ fill: color, color, bg: background })}
    </Svg>
  );
}
