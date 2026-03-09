'use client';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
// ─── Warm Earthy Theme Colors ───────────────────────────────────────────
const THEME = {
  bg: '#F5EDE4',
  surface: '#FFFFFF',
  card: '#F0E7DC',
  border: '#D8CCBE',
  text: '#2A2018',
  textMuted: '#9A8E82',
  accent: '#C17C64',
  accentAlt: '#D4A574',
  success: '#8FA395',
  warning: '#D4A574',
  danger: '#C17C64',
  purple: '#9B7EB5',
  pink: '#C4889B',
  cyan: '#7BA3B0',
  orange: '#CB8A5E',
  gradientStart: '#C17C64',
  gradientEnd: '#D4A574',
  palette: ['#C17C64', '#D4A574', '#8FA395', '#9B7EB5', '#C4889B', '#CB8A5E', '#7BA3B0', '#B8926A', '#A68E7B', '#6B8F7B'],
};

// ─── Icon map for visualization types ────────────────────────────────────────
// Material icon names for visualization types
const VIZ_ICON_NAMES = {
  force_graph: 'hub',
  tree: 'account_tree',
  bar_chart: 'bar_chart',
  flow_diagram: 'schema',
  bubble_chart: 'bubble_chart',
  timeline: 'timeline',
  radial: 'donut_large',
  animated_steps: 'animation',
  sankey: 'schema',
  heatmap: 'grid_on',
  pie_chart: 'pie_chart',
  scatter_plot: 'scatter_plot',
};

function MaterialIcon({ name, size = 18, color }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, color }}>{name}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORCE GRAPH — relationships, dependencies, concept maps
// ═══════════════════════════════════════════════════════════════════════════════
function renderForceGraph(svgEl, data, dims) {
  const { width, height } = dims;
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();

  const defs = svg.append('defs');
  // Glow filter
  const filter = defs.append('filter').attr('id', 'glow');
  filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
  const feMerge = filter.append('feMerge');
  feMerge.append('feMergeNode').attr('in', 'coloredBlur');
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

  // Arrow marker
  defs.append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 20).attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 6).attr('markerHeight', 6)
    .append('path').attr('d', 'M 0,-5 L 10,0 L 0,5')
    .attr('fill', THEME.accentAlt).attr('opacity', 0.6);

  const nodes = data.nodes || [];
  const links = data.links || [];

  // ── Simulation: spread nodes across the full canvas ──
  // Seed initial positions in a circle so the simulation doesn't collapse to a line
  const angleStep = (2 * Math.PI) / nodes.length;
  const initR = Math.min(width, height) * 0.3;
  nodes.forEach((d, i) => {
    if (d.x == null) d.x = width / 2 + initR * Math.cos(angleStep * i);
    if (d.y == null) d.y = height / 2 + initR * Math.sin(angleStep * i);
  });

  // Filter out links that reference non-existent nodes
  const nodeIds = new Set(nodes.map(n => n.id));
  const validLinks = links.filter(l => nodeIds.has(l.source?.id ?? l.source) && nodeIds.has(l.target?.id ?? l.target));

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(validLinks).id(d => d.id).distance(d => d.distance || 140).strength(0.3))
    .force('charge', d3.forceManyBody().strength(-400))
    .force('x', d3.forceX(width / 2).strength(0.04))
    .force('y', d3.forceY(height / 2).strength(0.04))
    .force('collision', d3.forceCollide().radius(65));

  simulation.tick(300);
  simulation.stop();

  // ── Fit to viewport ──
  const pad = 60;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodes.forEach(d => { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); minY = Math.min(minY, d.y); maxY = Math.max(maxY, d.y); });
  const bw = (maxX - minX) || 1, bh = (maxY - minY) || 1;
  const scale = Math.min((width - pad * 2) / bw, (height - pad * 2) / bh, 1.2);
  const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
  const tx = width / 2 - midX * scale, ty = height / 2 - midY * scale;

  const g = svg.append('g').attr('transform', `translate(${tx},${ty}) scale(${scale})`);

  // ── Links (curved) ──
  g.append('g').selectAll('path')
    .data(links).join('path')
    .attr('d', d => {
      const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
      const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
      return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
    })
    .attr('fill', 'none')
    .attr('stroke', THEME.border)
    .attr('stroke-width', 1.5 / scale)
    .attr('stroke-opacity', 0.4)
    .attr('marker-end', 'url(#arrowhead)');

  // ── Link labels on the curve midpoint ──
  const linkLabels = g.append('g').selectAll('g')
    .data(links.filter(l => l.label)).join('g')
    .attr('transform', d => {
      const mx = (d.source.x + d.target.x) / 2;
      const my = (d.source.y + d.target.y) / 2 - 16 / scale;
      return `translate(${mx},${my})`;
    });

  // Background pill for readability
  linkLabels.append('rect')
    .attr('x', d => -(d.label.length * 3.5) - 4)
    .attr('y', -7 / scale)
    .attr('width', d => d.label.length * 7 + 8)
    .attr('height', 14 / scale)
    .attr('rx', 4).attr('fill', THEME.bg).attr('opacity', 0.85);

  linkLabels.append('text')
    .text(d => d.label)
    .attr('text-anchor', 'middle')
    .attr('fill', THEME.accent).attr('font-size', 9 / scale).attr('font-weight', 500);

  // ── Nodes ──
  const nodeGroup = g.append('g').selectAll('g')
    .data(nodes).join('g')
    .attr('transform', d => `translate(${d.x},${d.y})`);

  // Circle
  nodeGroup.append('circle')
    .attr('r', d => d.size || 16)
    .attr('fill', (d, i) => d.color || THEME.palette[i % THEME.palette.length])
    .attr('stroke', '#fff').attr('stroke-width', 2.5 / scale)
    .attr('opacity', 0.9);

  // Label below node
  nodeGroup.append('text')
    .text(d => d.label || d.id)
    .attr('dy', d => (d.size || 16) + 16 / scale)
    .attr('text-anchor', 'middle')
    .attr('fill', THEME.text).attr('font-size', 11 / scale).attr('font-weight', 600);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TREE DIAGRAM — hierarchies, class inheritance, decision trees
// ═══════════════════════════════════════════════════════════════════════════════
function renderTree(svgEl, data, dims) {
  const { width, height } = dims;
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();

  const margin = { top: 40, right: 40, bottom: 40, left: 40 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const root = d3.hierarchy(data.root || data);
  const treeLayout = d3.tree().size([innerW, innerH - 40]);
  treeLayout(root);

  // Curved links
  g.selectAll('path.link')
    .data(root.links()).join('path')
    .attr('class', 'link')
    .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y))
    .attr('fill', 'none')
    .attr('stroke', THEME.accentAlt).attr('stroke-opacity', 0.4).attr('stroke-width', 2);

  const node = g.selectAll('g.node')
    .data(root.descendants()).join('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.x},${d.y})`);

  node.append('rect')
    .attr('x', d => -(Math.max(60, (d.data.name || d.data.label || '').length * 7)) / 2)
    .attr('y', -15)
    .attr('width', d => Math.max(60, (d.data.name || d.data.label || '').length * 7))
    .attr('height', 30)
    .attr('rx', 8)
    .attr('fill', (d) => d.depth === 0 ? THEME.accent : d.children ? THEME.card : THEME.surface)
    .attr('stroke', (d) => d.depth === 0 ? THEME.accent : THEME.border)
    .attr('stroke-width', 1.5);

  node.append('text')
    .text(d => d.data.name || d.data.label || '')
    .attr('text-anchor', 'middle').attr('dy', 5)
    .attr('fill', d => d.depth === 0 ? THEME.bg : THEME.text)
    .attr('font-size', 11).attr('font-weight', d => d.depth === 0 ? 700 : 500);

  // Add value labels if present
  node.filter(d => d.data.value !== undefined)
    .append('text')
    .text(d => d.data.value)
    .attr('text-anchor', 'middle').attr('dy', 26)
    .attr('fill', THEME.accent).attr('font-size', 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAR CHART — comparisons, performance, complexity
// ═══════════════════════════════════════════════════════════════════════════════
function renderBarChart(svgEl, data, dims) {
  const { width, height } = dims;
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();

  const margin = { top: 30, right: 30, bottom: 60, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const items = data.items || data.bars || [];
  const isGrouped = items.length > 0 && Array.isArray(items[0].values);

  if (!isGrouped) {
    // Simple bar chart
    const x = d3.scaleBand().domain(items.map(d => d.label)).range([0, innerW]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(items, d => d.value) * 1.15]).range([innerH, 0]);

    // Grid lines
    g.append('g').selectAll('line')
      .data(y.ticks(5)).join('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', THEME.border).attr('stroke-opacity', 0.3);

    // Bars with gradient
    const defs = svg.append('defs');
    items.forEach((d, i) => {
      const grad = defs.append('linearGradient').attr('id', `bar-grad-${i}`).attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1);
      const color = d.color || THEME.palette[i % THEME.palette.length];
      grad.append('stop').attr('offset', '0%').attr('stop-color', color);
      grad.append('stop').attr('offset', '100%').attr('stop-color', d3.color(color).darker(0.8));
    });

    g.selectAll('rect.bar')
      .data(items).join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.label))
      .attr('width', x.bandwidth())
      .attr('y', innerH)
      .attr('height', 0)
      .attr('rx', 4)
      .attr('fill', (d, i) => `url(#bar-grad-${i})`)
      .transition().duration(800).delay((d, i) => i * 100)
      .attr('y', d => y(d.value))
      .attr('height', d => innerH - y(d.value));

    // Value labels
    g.selectAll('text.value')
      .data(items).join('text')
      .attr('class', 'value')
      .attr('x', d => x(d.label) + x.bandwidth() / 2)
      .attr('y', d => y(d.value) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', THEME.accent).attr('font-size', 12).attr('font-weight', 600)
      .text(d => d.value);

    // Axes
    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x)).selectAll('text')
      .attr('fill', THEME.textMuted).attr('font-size', 11)
      .attr('transform', items.length > 6 ? 'rotate(-35)' : '').style('text-anchor', items.length > 6 ? 'end' : 'middle');
    g.append('g').call(d3.axisLeft(y).ticks(5))
      .selectAll('text').attr('fill', THEME.textMuted);
    g.selectAll('.domain, .tick line').attr('stroke', THEME.border);
  } else {
    // Grouped bar chart
    const categories = items.map(d => d.label);
    const groups = items[0].values.map((_, i) => i);
    const x0 = d3.scaleBand().domain(categories).range([0, innerW]).padding(0.2);
    const x1 = d3.scaleBand().domain(groups).range([0, x0.bandwidth()]).padding(0.05);
    const maxVal = d3.max(items, d => d3.max(d.values, v => (typeof v === 'object' ? v.value : v)));
    const y = d3.scaleLinear().domain([0, maxVal * 1.15]).range([innerH, 0]);

    items.forEach((item, idx) => {
      item.values.forEach((v, gi) => {
        const val = typeof v === 'object' ? v.value : v;
        g.append('rect')
          .attr('x', x0(item.label) + x1(gi))
          .attr('width', x1.bandwidth())
          .attr('y', innerH).attr('height', 0).attr('rx', 3)
          .attr('fill', THEME.palette[gi % THEME.palette.length])
          .transition().duration(800).delay(idx * 100 + gi * 50)
          .attr('y', y(val)).attr('height', innerH - y(val));
      });
    });

    g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x0))
      .selectAll('text').attr('fill', THEME.textMuted).attr('font-size', 11);
    g.append('g').call(d3.axisLeft(y).ticks(5)).selectAll('text').attr('fill', THEME.textMuted);
    g.selectAll('.domain, .tick line').attr('stroke', THEME.border);

    // Legend
    if (data.legend) {
      const legend = g.append('g').attr('transform', `translate(${innerW - 120}, -10)`);
      data.legend.forEach((label, i) => {
        legend.append('rect').attr('x', 0).attr('y', i * 20).attr('width', 12).attr('height', 12).attr('rx', 3).attr('fill', THEME.palette[i]);
        legend.append('text').attr('x', 18).attr('y', i * 20 + 10).text(label).attr('fill', THEME.textMuted).attr('font-size', 11);
      });
    }
  }

  // Title
  if (data.title) {
    svg.append('text').attr('x', width / 2).attr('y', 18)
      .attr('text-anchor', 'middle').attr('fill', THEME.text).attr('font-size', 14).attr('font-weight', 600)
      .text(data.title);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW DIAGRAM — algorithms, processes, data pipelines
// ═══════════════════════════════════════════════════════════════════════════════
function renderFlowDiagram(svgEl, data, dims) {
  const { width, height } = dims;
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();

  const steps = data.steps || [];
  const isVertical = data.direction === 'vertical';
  const n = steps.length;

  if (n === 0) return;

  const defs = svg.append('defs');
  const grad = defs.append('linearGradient').attr('id', 'flow-grad').attr('x1', 0).attr('y1', 0).attr('x2', 1).attr('y2', 0);
  grad.append('stop').attr('offset', '0%').attr('stop-color', THEME.accent);
  grad.append('stop').attr('offset', '100%').attr('stop-color', THEME.accentAlt);

  // Arrow marker
  defs.append('marker').attr('id', 'flow-arrow').attr('viewBox', '0 -5 10 10')
    .attr('refX', 8).attr('refY', 0).attr('orient', 'auto')
    .attr('markerWidth', 8).attr('markerHeight', 8)
    .append('path').attr('d', 'M 0,-4 L 8,0 L 0,4').attr('fill', THEME.accent);

  const g = svg.append('g');

  if (isVertical) {
    const stepH = Math.min(70, (height - 40) / n);
    const startY = (height - n * stepH) / 2;
    const cx = width / 2;

    steps.forEach((step, i) => {
      const y = startY + i * stepH;
      const boxW = Math.min(280, width - 80);

      // Connector arrow
      if (i > 0) {
        g.append('line')
          .attr('x1', cx).attr('y1', y - stepH + 28).attr('x2', cx).attr('y2', y - 4)
          .attr('stroke', THEME.accent).attr('stroke-width', 2)
          .attr('marker-end', 'url(#flow-arrow)').attr('opacity', 0.6);
      }

      const isDecision = step.type === 'decision';
      const nodeG = g.append('g').attr('transform', `translate(${cx}, ${y})`);

      if (isDecision) {
        nodeG.append('polygon')
          .attr('points', `0,-22 ${boxW / 3},-0 0,22 ${-boxW / 3},0`)
          .attr('fill', THEME.card).attr('stroke', THEME.warning).attr('stroke-width', 2);
      } else {
        nodeG.append('rect')
          .attr('x', -boxW / 2).attr('y', -18).attr('width', boxW).attr('height', 36).attr('rx', 10)
          .attr('fill', i === 0 ? THEME.accent : i === n - 1 ? THEME.success : THEME.card)
          .attr('stroke', i === 0 ? THEME.accent : i === n - 1 ? THEME.success : THEME.border).attr('stroke-width', 1.5);
      }

      nodeG.append('text')
        .text(step.label || step.name || `Step ${i + 1}`)
        .attr('text-anchor', 'middle').attr('dy', 5)
        .attr('fill', (i === 0) ? THEME.bg : THEME.text)
        .attr('font-size', 12).attr('font-weight', i === 0 || i === n - 1 ? 700 : 500);

      if (step.description) {
        nodeG.append('text').text(step.description)
          .attr('text-anchor', 'middle').attr('dy', 28)
          .attr('fill', THEME.textMuted).attr('font-size', 10);
      }
    });
  } else {
    // Horizontal flow
    const stepW = Math.min(160, (width - 60) / n);
    const startX = (width - n * stepW) / 2 + stepW / 2;
    const cy = height / 2;

    steps.forEach((step, i) => {
      const x = startX + i * stepW;
      const boxW = stepW - 30;

      if (i > 0) {
        g.append('line')
          .attr('x1', x - stepW + boxW / 2 + 8).attr('y1', cy)
          .attr('x2', x - boxW / 2 - 4).attr('y2', cy)
          .attr('stroke', THEME.accent).attr('stroke-width', 2)
          .attr('marker-end', 'url(#flow-arrow)').attr('opacity', 0.6);
      }

      const nodeG = g.append('g').attr('transform', `translate(${x}, ${cy})`);
      nodeG.append('rect')
        .attr('x', -boxW / 2).attr('y', -25).attr('width', boxW).attr('height', 50).attr('rx', 10)
        .attr('fill', i === 0 ? THEME.accent : i === n - 1 ? THEME.success : THEME.card)
        .attr('stroke', i === 0 ? THEME.accent : i === n - 1 ? THEME.success : THEME.border).attr('stroke-width', 1.5);

      // Step number
      nodeG.append('circle').attr('cx', 0).attr('cy', -35).attr('r', 12)
        .attr('fill', THEME.surface).attr('stroke', THEME.palette[i % THEME.palette.length]).attr('stroke-width', 2);
      nodeG.append('text').text(i + 1).attr('y', -31).attr('text-anchor', 'middle')
        .attr('fill', THEME.palette[i % THEME.palette.length]).attr('font-size', 11).attr('font-weight', 700);

      // Wrap text
      const words = (step.label || step.name || `Step ${i + 1}`).split(' ');
      let line = '', lineNum = 0;
      words.forEach(w => {
        if ((line + ' ' + w).length > boxW / 7) {
          nodeG.append('text').text(line.trim()).attr('text-anchor', 'middle').attr('dy', lineNum * 14).attr('fill', i === 0 ? THEME.bg : THEME.text).attr('font-size', 11).attr('font-weight', 500);
          line = w;
          lineNum++;
        } else {
          line += ' ' + w;
        }
      });
      if (line.trim()) {
        nodeG.append('text').text(line.trim()).attr('text-anchor', 'middle').attr('dy', lineNum * 14).attr('fill', i === 0 ? THEME.bg : THEME.text).attr('font-size', 11).attr('font-weight', 500);
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUBBLE CHART — relative importance, size comparisons
// ═══════════════════════════════════════════════════════════════════════════════
function renderBubbleChart(svgEl, data, dims) {
  const { width, height } = dims;
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();

  const items = data.items || data.bubbles || [];
  if (items.length === 0) return;

  const defs = svg.append('defs');
  const filter = defs.append('filter').attr('id', 'bubble-shadow');
  filter.append('feDropShadow').attr('dx', 0).attr('dy', 2).attr('stdDeviation', 4).attr('flood-color', 'rgba(0,0,0,0.4)');

  const pack = d3.pack()
    .size([width - 20, height - 20])
    .padding(6);

  const root = d3.hierarchy({ children: items }).sum(d => d.value || d.size || 1);
  const nodes = pack(root).leaves();

  const g = svg.append('g').attr('transform', 'translate(10,10)');

  const node = g.selectAll('g').data(nodes).join('g')
    .attr('transform', d => `translate(${d.x},${d.y})`);

  node.append('circle')
    .attr('r', 0)
    .attr('fill', (d, i) => d.data.color || THEME.palette[i % THEME.palette.length])
    .attr('opacity', 0.85)
    .attr('filter', 'url(#bubble-shadow)')
    .attr('stroke', THEME.bg).attr('stroke-width', 1.5)
    .transition().duration(600).delay((d, i) => i * 80)
    .attr('r', d => d.r);

  node.append('text')
    .text(d => d.data.label || d.data.name || '')
    .attr('text-anchor', 'middle').attr('dy', d => d.r > 30 ? -4 : 4)
    .attr('fill', THEME.text).attr('font-size', d => Math.max(9, Math.min(13, d.r / 3.5)))
    .attr('font-weight', 600);

  node.filter(d => d.r > 25).append('text')
    .text(d => d.data.value || d.data.size || '')
    .attr('text-anchor', 'middle').attr('dy', 14)
    .attr('fill', THEME.textMuted).attr('font-size', 10);

  if (data.title) {
    svg.append('text').attr('x', width / 2).attr('y', 16)
      .attr('text-anchor', 'middle').attr('fill', THEME.text).attr('font-size', 14).attr('font-weight', 600)
      .text(data.title);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE — history, sequence of events, milestones
// ═══════════════════════════════════════════════════════════════════════════════
function renderTimeline(svgEl, data, dims) {
  const { width, height } = dims;
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();

  const events = data.events || data.items || [];
  if (events.length === 0) return;

  const margin = { left: 50, right: 50 };
  const innerW = width - margin.left - margin.right;
  const cy = height / 2;

  const g = svg.append('g').attr('transform', `translate(${margin.left}, 0)`);

  // Main timeline line
  const defs = svg.append('defs');
  const grad = defs.append('linearGradient').attr('id', 'tl-grad').attr('x1', 0).attr('y1', 0).attr('x2', 1).attr('y2', 0);
  grad.append('stop').attr('offset', '0%').attr('stop-color', THEME.accent);
  grad.append('stop').attr('offset', '100%').attr('stop-color', THEME.accentAlt);

  g.append('line')
    .attr('x1', 0).attr('y1', cy).attr('x2', innerW).attr('y2', cy)
    .attr('stroke', 'url(#tl-grad)').attr('stroke-width', 3).attr('stroke-linecap', 'round');

  const spacing = innerW / (events.length + 1);

  events.forEach((event, i) => {
    const x = spacing * (i + 1);
    const isAbove = i % 2 === 0;
    const yOff = isAbove ? -50 : 50;

    // Vertical connector
    g.append('line')
      .attr('x1', x).attr('y1', cy).attr('x2', x).attr('y2', cy + yOff * 0.6)
      .attr('stroke', THEME.border).attr('stroke-width', 1.5).attr('stroke-dasharray', '4,3');

    // Node circle
    g.append('circle').attr('cx', x).attr('cy', cy).attr('r', 8)
      .attr('fill', event.color || THEME.palette[i % THEME.palette.length])
      .attr('stroke', THEME.bg).attr('stroke-width', 3);

    // Card
    const cardG = g.append('g').attr('transform', `translate(${x}, ${cy + yOff})`);
    const textW = Math.min(140, spacing - 10);

    cardG.append('rect')
      .attr('x', -textW / 2).attr('y', isAbove ? -40 : -5).attr('width', textW).attr('height', 45)
      .attr('rx', 8).attr('fill', THEME.card).attr('stroke', THEME.border).attr('stroke-width', 1);

    cardG.append('text').text(event.label || event.title || `Event ${i + 1}`)
      .attr('text-anchor', 'middle').attr('dy', isAbove ? -20 : 14)
      .attr('fill', THEME.text).attr('font-size', 11).attr('font-weight', 600);

    if (event.date || event.year) {
      cardG.append('text').text(event.date || event.year)
        .attr('text-anchor', 'middle').attr('dy', isAbove ? -4 : 30)
        .attr('fill', THEME.accent).attr('font-size', 10);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// RADIAL / DONUT CHART — categories, distributions
// ═══════════════════════════════════════════════════════════════════════════════
function renderRadial(svgEl, data, dims) {
  const { width, height } = dims;
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();

  const items = data.items || data.segments || [];
  if (items.length === 0) return;

  const radius = Math.min(width, height) / 2 - 40;
  const innerRadius = radius * 0.5;
  const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

  const pie = d3.pie().value(d => d.value || 1).padAngle(0.02).sort(null);
  const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius).cornerRadius(4);
  const arcHover = d3.arc().innerRadius(innerRadius).outerRadius(radius + 8).cornerRadius(4);

  const arcs = g.selectAll('path')
    .data(pie(items)).join('path')
    .attr('d', arc)
    .attr('fill', (d, i) => d.data.color || THEME.palette[i % THEME.palette.length])
    .attr('stroke', THEME.bg).attr('stroke-width', 2)
    .attr('opacity', 0.9)
    .on('mouseover', function (e, d) {
      d3.select(this).transition().duration(200).attr('d', arcHover).attr('opacity', 1);
      g.select('.center-label').text(d.data.label || '');
      g.select('.center-value').text(d.data.value || '');
    })
    .on('mouseout', function () {
      d3.select(this).transition().duration(200).attr('d', arc).attr('opacity', 0.9);
      g.select('.center-label').text(data.title || '');
      g.select('.center-value').text('');
    });

  // Center text
  g.append('text').attr('class', 'center-label').text(data.title || '')
    .attr('text-anchor', 'middle').attr('dy', -4).attr('fill', THEME.text).attr('font-size', 14).attr('font-weight', 600);
  g.append('text').attr('class', 'center-value').text('')
    .attr('text-anchor', 'middle').attr('dy', 18).attr('fill', THEME.accent).attr('font-size', 16).attr('font-weight', 700);

  // Legend
  const legend = svg.append('g').attr('transform', `translate(${width - 130}, 20)`);
  items.forEach((item, i) => {
    legend.append('rect').attr('x', 0).attr('y', i * 22).attr('width', 14).attr('height', 14).attr('rx', 4)
      .attr('fill', item.color || THEME.palette[i % THEME.palette.length]);
    legend.append('text').attr('x', 20).attr('y', i * 22 + 11).text(item.label || '')
      .attr('fill', THEME.textMuted).attr('font-size', 11);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED STEPS — step-by-step algorithm visualization
// ═══════════════════════════════════════════════════════════════════════════════
function AnimatedSteps({ data, dims }) {
  const svgRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(0);
  const steps = data.steps || [];

  useEffect(() => {
    if (!svgRef.current || steps.length === 0) return;
    const { width, height } = dims;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const step = steps[currentStep];
    if (!step) return;

    const g = svg.append('g');

    // Array visualization
    if (step.array || step.data) {
      const arr = step.array || step.data;
      const cellW = Math.min(60, (width - 80) / arr.length);
      const startX = (width - arr.length * cellW) / 2;
      const arrY = height / 2 - 20;

      arr.forEach((val, i) => {
        const item = typeof val === 'object' ? val : { value: val };
        const isHighlighted = (step.highlights || []).includes(i);
        const isComparing = (step.comparing || []).includes(i);
        const isSwapping = (step.swapping || []).includes(i);
        const isSorted = (step.sorted || []).includes(i);

        let fillColor = THEME.card;
        if (isSwapping) fillColor = THEME.danger;
        else if (isComparing) fillColor = THEME.accent;
        else if (isHighlighted) fillColor = THEME.accentAlt;
        else if (isSorted) fillColor = THEME.success;
        if (item.color) fillColor = item.color;

        g.append('rect')
          .attr('x', startX + i * cellW).attr('y', arrY)
          .attr('width', cellW - 4).attr('height', 44).attr('rx', 6)
          .attr('fill', fillColor).attr('stroke', THEME.border).attr('stroke-width', 1.5);

        g.append('text')
          .text(item.value !== undefined ? item.value : val)
          .attr('x', startX + i * cellW + (cellW - 4) / 2).attr('y', arrY + 27)
          .attr('text-anchor', 'middle').attr('fill', THEME.text).attr('font-size', 16).attr('font-weight', 700);

        // Index label
        g.append('text')
          .text(i)
          .attr('x', startX + i * cellW + (cellW - 4) / 2).attr('y', arrY + 60)
          .attr('text-anchor', 'middle').attr('fill', THEME.textMuted).attr('font-size', 10);
      });

      // Pointer arrows
      if (step.pointers) {
        Object.entries(step.pointers).forEach(([label, idx], pi) => {
          const px = startX + idx * cellW + (cellW - 4) / 2;
          g.append('polygon')
            .attr('points', `${px},${arrY - 8} ${px - 6},${arrY - 20} ${px + 6},${arrY - 20}`)
            .attr('fill', THEME.palette[pi % THEME.palette.length]);
          g.append('text').text(label)
            .attr('x', px).attr('y', arrY - 24).attr('text-anchor', 'middle')
            .attr('fill', THEME.palette[pi % THEME.palette.length]).attr('font-size', 11).attr('font-weight', 600);
        });
      }
    }

    // Step description
    if (step.description || step.label) {
      g.append('text').text(step.description || step.label)
        .attr('x', width / 2).attr('y', height - 30).attr('text-anchor', 'middle')
        .attr('fill', THEME.text).attr('font-size', 13).attr('font-weight', 500);
    }

    // Step counter
    g.append('text').text(`Step ${currentStep + 1} / ${steps.length}`)
      .attr('x', width / 2).attr('y', 24).attr('text-anchor', 'middle')
      .attr('fill', THEME.textMuted).attr('font-size', 12);

  }, [currentStep, data, dims, steps]);

  return (
    <div className="relative">
      <svg ref={svgRef} width={dims.width} height={dims.height}
        style={{ background: THEME.bg, borderRadius: 12 }} />
      {steps.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
            disabled={currentStep === 0}
            className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] disabled:opacity-30 transition-colors">
            <MaterialIcon name="chevron_left" size={18} color={THEME.text} />
          </button>
          {/* Step dots */}
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <button key={i} onClick={() => setCurrentStep(i)}
                className="w-2 h-2 rounded-full transition-all duration-200"
                style={{ background: i === currentStep ? THEME.accent : THEME.border, transform: i === currentStep ? 'scale(1.3)' : 'scale(1)' }} />
            ))}
          </div>
          <button onClick={() => setCurrentStep(s => Math.min(steps.length - 1, s + 1))}
            disabled={currentStep === steps.length - 1}
            className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] disabled:opacity-30 transition-colors">
            <MaterialIcon name="chevron_right" size={18} color={THEME.text} />
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIE CHART
// ═══════════════════════════════════════════════════════════════════════════════
function renderPieChart(svgEl, data, dims) {
  renderRadial(svgEl, { ...data, title: data.title || '' }, dims);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCATTER PLOT
// ═══════════════════════════════════════════════════════════════════════════════
function renderScatterPlot(svgEl, data, dims) {
  const { width, height } = dims;
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();

  const margin = { top: 30, right: 30, bottom: 50, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const points = data.points || data.items || [];
  if (points.length === 0) return;

  const x = d3.scaleLinear().domain(d3.extent(points, d => d.x)).nice().range([0, innerW]);
  const y = d3.scaleLinear().domain(d3.extent(points, d => d.y)).nice().range([innerH, 0]);

  // Grid
  g.append('g').selectAll('line').data(y.ticks(5)).join('line')
    .attr('x1', 0).attr('x2', innerW).attr('y1', d => y(d)).attr('y2', d => y(d))
    .attr('stroke', THEME.border).attr('stroke-opacity', 0.3);

  g.selectAll('circle')
    .data(points).join('circle')
    .attr('cx', d => x(d.x)).attr('cy', d => y(d.y))
    .attr('r', d => d.size || 6)
    .attr('fill', (d, i) => d.color || THEME.palette[i % THEME.palette.length])
    .attr('opacity', 0.8).attr('stroke', THEME.bg).attr('stroke-width', 1);

  g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6))
    .selectAll('text').attr('fill', THEME.textMuted);
  g.append('g').call(d3.axisLeft(y).ticks(5)).selectAll('text').attr('fill', THEME.textMuted);
  g.selectAll('.domain, .tick line').attr('stroke', THEME.border);

  if (data.x_label) svg.append('text').attr('x', width / 2).attr('y', height - 6).attr('text-anchor', 'middle').attr('fill', THEME.textMuted).attr('font-size', 12).text(data.x_label);
  if (data.y_label) svg.append('text').attr('x', 14).attr('y', height / 2).attr('text-anchor', 'middle').attr('transform', `rotate(-90, 14, ${height / 2})`).attr('fill', THEME.textMuted).attr('font-size', 12).text(data.y_label);
  if (data.title) svg.append('text').attr('x', width / 2).attr('y', 18).attr('text-anchor', 'middle').attr('fill', THEME.text).attr('font-size', 14).attr('font-weight', 600).text(data.title);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEATMAP
// ═══════════════════════════════════════════════════════════════════════════════
function renderHeatmap(svgEl, data, dims) {
  const { width, height } = dims;
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();

  const rows = data.rows || [];
  const cols = data.columns || [];
  const values = data.values || [];
  if (rows.length === 0 || cols.length === 0) return;

  const margin = { top: 50, right: 30, bottom: 30, left: 100 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Compact cells — cap size so they don't get huge
  const maxCellW = 80, maxCellH = 50;
  const cellW = Math.min(maxCellW, innerW / cols.length);
  const cellH = Math.min(maxCellH, innerH / rows.length);
  const gap = 3;

  // Center the grid
  const gridW = cols.length * cellW;
  const gridH = rows.length * cellH;
  const offX = (innerW - gridW) / 2;
  const offY = (innerH - gridH) / 2;

  const maxVal = d3.max(values.flat()) || 1;

  // Theme-based color scale: light creme → sage → terracotta
  const colorScale = d3.scaleLinear()
    .domain([0, maxVal * 0.35, maxVal * 0.7, maxVal])
    .range(['#EDE5DB', '#D4C5A9', '#D4A574', '#C17C64'])
    .clamp(true);

  rows.forEach((row, ri) => {
    cols.forEach((col, ci) => {
      const val = (values[ri] || [])[ci] || 0;
      const x = offX + ci * cellW;
      const y = offY + ri * cellH;

      g.append('rect')
        .attr('x', x + gap / 2).attr('y', y + gap / 2)
        .attr('width', cellW - gap).attr('height', cellH - gap)
        .attr('rx', 6)
        .attr('fill', colorScale(val))
        .attr('stroke', THEME.bg).attr('stroke-width', 1);

      g.append('text')
        .text(val)
        .attr('x', x + cellW / 2).attr('y', y + cellH / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', val > maxVal * 0.6 ? '#FFF' : THEME.text)
        .attr('font-size', 12).attr('font-weight', 600);
    });
  });

  // Row labels
  rows.forEach((r, i) => {
    g.append('text').text(r)
      .attr('x', offX - 10).attr('y', offY + i * cellH + cellH / 2 + 4)
      .attr('text-anchor', 'end').attr('fill', THEME.text).attr('font-size', 11).attr('font-weight', 500);
  });

  // Col labels
  cols.forEach((c, i) => {
    g.append('text').text(c)
      .attr('x', offX + i * cellW + cellW / 2).attr('y', offY - 10)
      .attr('text-anchor', 'middle').attr('fill', THEME.text).attr('font-size', 11).attr('font-weight', 500);
  });

  // Legend bar
  const legendW = 120, legendH = 8;
  const legendX = offX + gridW - legendW;
  const legendY = offY + gridH + 18;
  const legendDefs = svg.append('defs');
  const legendGrad = legendDefs.append('linearGradient').attr('id', 'hm-legend').attr('x1', 0).attr('y1', 0).attr('x2', 1).attr('y2', 0);
  legendGrad.append('stop').attr('offset', '0%').attr('stop-color', '#EDE5DB');
  legendGrad.append('stop').attr('offset', '50%').attr('stop-color', '#D4A574');
  legendGrad.append('stop').attr('offset', '100%').attr('stop-color', '#C17C64');

  g.append('rect').attr('x', legendX).attr('y', legendY).attr('width', legendW).attr('height', legendH).attr('rx', 4).attr('fill', 'url(#hm-legend)');
  g.append('text').text('Low').attr('x', legendX - 4).attr('y', legendY + 7).attr('text-anchor', 'end').attr('fill', THEME.textMuted).attr('font-size', 9);
  g.append('text').text('High').attr('x', legendX + legendW + 4).attr('y', legendY + 7).attr('text-anchor', 'start').attr('fill', THEME.textMuted).attr('font-size', 9);
}


// ═══════════════════════════════════════════════════════════════════════════════
// RENDER MAP — maps visualization type to render function
// ═══════════════════════════════════════════════════════════════════════════════
const RENDER_MAP = {
  force_graph: renderForceGraph,
  tree: renderTree,
  bar_chart: renderBarChart,
  flow_diagram: renderFlowDiagram,
  bubble_chart: renderBubbleChart,
  timeline: renderTimeline,
  radial: renderRadial,
  pie_chart: renderPieChart,
  scatter_plot: renderScatterPlot,
  heatmap: renderHeatmap,
};


// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE VISUALIZATION CARD
// ═══════════════════════════════════════════════════════════════════════════════
function VisualizationCard({ viz, index }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [dims, setDims] = useState({ width: 600, height: 380 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setDims({ width: Math.max(300, width - 8), height: expanded ? 500 : 380 });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [expanded]);

  useEffect(() => {
    if (!svgRef.current || !viz.data) return;
    const renderFn = RENDER_MAP[viz.type];
    if (renderFn) {
      renderFn(svgRef.current, viz.data, dims);
    }
  }, [viz, dims]);

  const isAnimated = viz.type === 'animated_steps';
  const iconName = VIZ_ICON_NAMES[viz.type] || 'bar_chart';
  const typeLabel = (viz.type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.5 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${THEME.surface}, ${THEME.card})`, border: `1px solid ${THEME.border}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${THEME.border}` }}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg" style={{ background: `${THEME.accent}18` }}>
            <MaterialIcon name={iconName} size={16} color={THEME.accent} />
          </div>
          <div>
            <h4 className="text-sm font-semibold" style={{ color: THEME.text }}>
              {viz.title || typeLabel}
            </h4>
            {viz.subtitle && <p className="text-xs" style={{ color: THEME.textMuted }}>{viz.subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${THEME.accentAlt}20`, color: THEME.accentAlt }}>
            {typeLabel}
          </span>
          <button onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-lg hover:bg-[#21262d] transition-colors">
            {expanded ? <MaterialIcon name="close_fullscreen" size={14} color={THEME.textMuted} /> : <MaterialIcon name="open_in_full" size={14} color={THEME.textMuted} />}
          </button>
        </div>
      </div>

      {/* Visualization */}
      <div className="p-2">
        {isAnimated ? (
          <AnimatedSteps data={viz.data} dims={dims} />
        ) : (
          <svg ref={svgRef} width={dims.width} height={dims.height}
            style={{ background: THEME.bg, borderRadius: 12 }} />
        )}
      </div>

      {/* Description */}
      {viz.description && (
        <div className="px-4 pb-3">
          <p className="text-xs leading-relaxed" style={{ color: THEME.textMuted }}>{viz.description}</p>
        </div>
      )}
    </motion.div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT: D3VisualizationEngine
// ═══════════════════════════════════════════════════════════════════════════════
export default function D3VisualizationEngine({ visualizations = [], conceptName = '', isLoading = false }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${THEME.accent} transparent ${THEME.accent} ${THEME.accent}` }} />
          <span className="text-sm font-medium" style={{ color: THEME.textMuted }}>Generating interactive visualizations for {conceptName}...</span>
        </div>
        {[1, 2].map(i => (
          <div key={i} className="rounded-2xl h-[300px] animate-pulse" style={{ background: THEME.surface }} />
        ))}
      </div>
    );
  }

  if (!visualizations || visualizations.length === 0) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl" style={{ background: `linear-gradient(135deg, ${THEME.accent}20, ${THEME.accentAlt}20)` }}>
            <MaterialIcon name="insights" size={18} color={THEME.accent} />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: THEME.text }}>Interactive Visualizations</h3>
            <p className="text-xs" style={{ color: THEME.textMuted }}>{visualizations.length} AI-generated diagrams for {conceptName}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5">
        {visualizations.map((viz, i) => (
          <VisualizationCard key={`${viz.type}-${i}`} viz={viz} index={i} />
        ))}
      </div>
    </div>
  );
}
