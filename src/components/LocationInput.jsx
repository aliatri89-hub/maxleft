import { useState } from "react";
import { EVENT_CITIES } from "../utils/countries";

function LocationInput({ value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  const q = (value || "").toLowerCase().trim();
  const suggestions = q.length >= 2 ? EVENT_CITIES.filter(c => c.toLowerCase().includes(q)).slice(0, 5) : [];
  const show = focused && suggestions.length > 0 && q !== suggestions[0]?.toLowerCase();
  return (
    <div style={{ position: "relative" }}>
      <input
        className="event-form-input"
        placeholder={placeholder || "City or landmark"}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {show && (
        <div className="location-suggestions">
          {suggestions.map((city, i) => (
            <div key={i} className="location-suggestion" onMouseDown={() => { onChange(city); setFocused(false); }}>
              {city}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LocationInput;
