import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface NetworkTopologyMapProps {
  // Add props if needed, for now using dummy data
}

export const NetworkTopologyMap: React.FC<NetworkTopologyMapProps> = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 400;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Dummy data
    const nodes = [
      { id: 'client', type: 'Client' },
      { id: 'proxy', type: 'SOCKS5 Proxy' },
      { id: 'entry', type: 'Tor Entry Guard' },
      { id: 'middle', type: 'Tor Middle' },
      { id: 'exit', type: 'Tor Exit' }
    ];

    const links = [
      { source: 'client', target: 'proxy', latency: 2 },
      { source: 'proxy', target: 'entry', latency: 50 },
      { source: 'entry', target: 'middle', latency: 120 },
      { source: 'middle', target: 'exit', latency: 150 }
    ];

    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 2);

    const node = svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', 10)
      .attr('fill', (d: any) => d.type === 'Client' ? '#14b8a6' : '#6366f1');

    const label = svg.append('g')
      .selectAll('text')
      .data(nodes)
      .enter().append('text')
      .text((d: any) => d.type)
      .attr('font-size', '12px')
      .attr('fill', '#fff')
      .attr('dx', 12)
      .attr('dy', 4);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

  }, []);

  return <svg ref={svgRef} className="w-full h-full bg-zinc-950 rounded-lg border border-zinc-800" />;
};
