import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Line, Transformer } from "react-konva";
import { nanoid } from "nanoid";
import "./App.css";

type Tool = "select" | "pen" | "eraser";

type LineShape = {
  id: string;
  points: number[];
  stroke: string;
  strokeWidth: number;
};

function Toolbar({ tool, setTool }: any) {
  return (
    <div className="toolbar">
      <button onClick={() => setTool("select")}>Select</button>
      <button onClick={() => setTool("pen")}>Pen</button>
      <button onClick={() => setTool("pan")}>Pan</button>
    </div>
  );
}

export default function App() {
  const [tool, setTool] = useState<Tool>("select");
  const [lines, setLines] = useState<LineShape[]>([]);
  const [currentLine, setCurrentLine] = useState<LineShape | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [camera, setCamera] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });

  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const lastPanPos = useRef<{ x: number; y: number } | null>(null);
  const layerRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  function getWorldPointer(stage: any, layer: any) {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    const transform = layer.getAbsoluteTransform().copy();
    transform.invert();

    return transform.point(pointer);
  }

  const handlePointerDown = (e: any) => {
    const stage = e.target.getStage();

    // Right or middle mouse
    if (e.evt.button === 1 || e.evt.button === 2) {
      isPanning.current = true;
      lastPanPos.current = {
        x: e.evt.clientX,
        y: e.evt.clientY,
      };
      return;
    }

    // Left mouse
    if (tool === "select") {
      if (e.target === stage) setSelectedId(null);
      return;
    }

    if (tool !== "pen") return;

    const pos = getWorldPointer(stage, layerRef.current);
    if (!pos) return;

    isDrawing.current = true;

    setCurrentLine({
      id: nanoid(),
      points: [pos.x, pos.y],
      stroke: "#df4b26",
      strokeWidth: 5,
    });
  };

  const handlePointerMove = (e: any) => {
    if (isPanning.current && lastPanPos.current) {
      const dx = e.evt.clientX - lastPanPos.current.x;
      const dy = e.evt.clientY - lastPanPos.current.y;

      setCamera(cam => ({
        ...cam,
        x: cam.x + dx,
        y: cam.y + dy,
      }));

      lastPanPos.current = {
        x: e.evt.clientX,
        y: e.evt.clientY,
      };
      return;
    }

    if (!isDrawing.current || tool !== "pen" || !currentLine) return;

    const stage = e.target.getStage();
    const pos = getWorldPointer(stage, layerRef.current);
    if (!pos) return;

    setCurrentLine(prev =>
      prev ? { ...prev, points: prev.points.concat([pos.x, pos.y]) } : null
    );

    layerRef.current?.batchDraw();
  };

  const handlePointerUp = () => {
    if (currentLine) {
      setLines(prev => [...prev, currentLine]);
    }

    setCurrentLine(null);
    isDrawing.current = false;
    isPanning.current = false;
    lastPanPos.current = null;
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.05;
    const oldScale = camera.scale;

    const mousePoint = {
      x: (pointer.x - camera.x) / oldScale,
      y: (pointer.y - camera.y) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale =
      direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    setCamera({
      scale: newScale,
      x: pointer.x - mousePoint.x * newScale,
      y: pointer.y - mousePoint.y * newScale,
    });
  };

  useEffect(() => {
    if (!trRef.current) return;
    const stage = trRef.current.getStage();
    const node = stage.findOne(`#${selectedId}`);
    trRef.current.nodes(node ? [node] : []);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedId]);

  return (
    <>
      <Toolbar tool={tool} setTool={setTool} />

      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        onContextMenu={e => e.evt.preventDefault()}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <Layer
          ref={layerRef}
          x={camera.x}
          y={camera.y}
          scaleX={camera.scale}
          scaleY={camera.scale}
        >
          {lines.map(line => (
            <Line
              key={line.id}
              id={line.id}
              points={line.points}
              stroke={line.stroke}
              strokeWidth={line.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              draggable={tool === "select"}
              onDragEnd={e => {
                const node = e.target;
                const dx = node.x();
                const dy = node.y();

                node.position({ x: 0, y: 0 });

                setLines(prev =>
                  prev.map(line =>
                    line.id === selectedId
                      ? {
                          ...line,
                          points: line.points.map((p, i) =>
                            i % 2 === 0 ? p + dx : p + dy
                          ),
                        }
                      : line
                  )
                );
              }}
              onClick={() => setSelectedId(line.id)}
            />
          ))}

          {currentLine && (
            <Line
              points={currentLine.points}
              stroke={currentLine.stroke}
              strokeWidth={currentLine.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          )}

          <Transformer ref={trRef} />
        </Layer>
      </Stage>
    </>
  );
}