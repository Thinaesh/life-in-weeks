export default function HeatmapLegend() {
  return (
    <div className="heatmap-legend" id="heatmap-legend">
      <span>Journal Heatmap:</span>
      <div className="heatmap-gradient"></div>
      <span className="scale-label">Terrible</span>
      <span className="scale-label">Amazing</span>
    </div>
  );
}
