

export default function AccessibilitySelect({                                               onSelect,
                                            accessibilityNeed}: { accessibilityNeed: string; onSelect: (item: string) => void; }) {


  const handleChange = (value: string) => {

    onSelect(value);
  };


  return (
    <select
      id="accessibility"
      name="accessibility"
      value={accessibilityNeed}
      onChange={(e) => handleChange(e.target.value)}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="">None</option>
      <option value="neurodivergent">Neurodivergent</option>
      <option value="dyslexia">Dyslexia</option>
    </select>
  );
}