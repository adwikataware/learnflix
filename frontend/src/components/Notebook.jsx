'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Toolbar colors for highlighter ─────────────────────────────────────────
const HIGHLIGHT_COLORS = [
    { id: 'yellow', color: 'rgba(250, 204, 21, 0.25)', border: '#FACC15', label: 'Yellow' },
    { id: 'green', color: 'rgba(70, 211, 105, 0.2)', border: '#46D369', label: 'Green' },
    { id: 'red', color: 'rgba(229, 9, 20, 0.15)', border: '#E50914', label: 'Red' },
    { id: 'blue', color: 'rgba(93, 173, 226, 0.2)', border: '#5DADE2', label: 'Blue' },
    { id: 'purple', color: 'rgba(175, 122, 197, 0.2)', border: '#AF7AC5', label: 'Purple' },
];

export default function Notebook({ pages = [], title = 'Notes', loading = false, onUploadRequest }) {
    const [currentSpread, setCurrentSpread] = useState(0);
    const [bookmarks, setBookmarks] = useState(new Set());
    const [showTOC, setShowTOC] = useState(false);
    const [flipDir, setFlipDir] = useState(0);
    const [showCorner, setShowCorner] = useState(false);
    const [activeTool, setActiveTool] = useState(null); // null | 'highlight' | 'pen' | 'eraser'
    const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
    const [highlights, setHighlights] = useState({}); // { pageIdx_blockIdx: colorId }
    const [penNotes, setPenNotes] = useState({}); // { pageIdx: "user text" }
    const [showToolbar, setShowToolbar] = useState(false);

    const totalPages = pages.length;
    const maxSpread = Math.max(0, totalPages - (totalPages % 2 === 0 ? 2 : 1));
    const leftIdx = currentSpread;
    const rightIdx = currentSpread + 1;
    const leftPage = pages[leftIdx];
    const rightPage = rightIdx < totalPages ? pages[rightIdx] : null;

    const flipNext = useCallback(() => {
        if (rightIdx >= totalPages - 1) return;
        setFlipDir(1);
        setCurrentSpread(prev => Math.min(prev + 2, maxSpread));
    }, [rightIdx, totalPages, maxSpread]);

    const flipPrev = useCallback(() => {
        if (currentSpread <= 0) return;
        setFlipDir(-1);
        setCurrentSpread(prev => Math.max(prev - 2, 0));
    }, [currentSpread]);

    const goToPage = (idx) => {
        const spread = idx % 2 === 0 ? idx : idx - 1;
        setFlipDir(spread > currentSpread ? 1 : -1);
        setCurrentSpread(Math.max(0, Math.min(spread, maxSpread)));
        setShowTOC(false);
    };

    const toggleBookmark = (idx) => {
        setBookmarks(prev => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    };

    const toggleHighlight = (pageIdx, blockIdx) => {
        if (activeTool !== 'highlight') return;
        const key = `${pageIdx}_${blockIdx}`;
        setHighlights(prev => {
            const next = { ...prev };
            if (next[key] === highlightColor.id) delete next[key];
            else next[key] = highlightColor.id;
            return next;
        });
    };

    const getHighlightStyle = (pageIdx, blockIdx) => {
        const key = `${pageIdx}_${blockIdx}`;
        const colorId = highlights[key];
        if (!colorId) return {};
        const c = HIGHLIGHT_COLORS.find(h => h.id === colorId);
        return c ? { backgroundColor: c.color, borderRadius: '3px', padding: '1px 3px', transition: 'background 0.2s' } : {};
    };

    useEffect(() => {
        const handleKey = (e) => {
            // Don't flip pages when user is typing or pen tool is active
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
            if (activeTool === 'pen') return;
            if (e.key === 'ArrowRight') flipNext();
            if (e.key === 'ArrowLeft') flipPrev();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [flipNext, flipPrev, activeTool]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-5">
                    <motion.div animate={{ rotateY: [0, 20, -20, 0] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }} style={{ perspective: 400 }}>
                        <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 72, fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
                    </motion.div>
                    <motion.p className="text-[#808080] font-semibold text-lg"
                        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2 }}>
                        Generating your notes...
                    </motion.p>
                </div>
            </div>
        );
    }

    if (totalPages === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <motion.div className="flex flex-col items-center gap-4" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <span className="material-symbols-outlined text-[#333]" style={{ fontSize: 80 }}>auto_stories</span>
                    <p className="text-[#808080] text-lg">Your notebook is empty</p>
                    {onUploadRequest && (
                        <button onClick={onUploadRequest} className="mt-2 flex items-center gap-2 bg-[#E50914] text-white font-bold px-6 py-3 rounded hover:brightness-110">
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>upload_file</span>
                            Upload Your Notes
                        </button>
                    )}
                </motion.div>
            </div>
        );
    }

    // ─── Page renderer ─────────────────────────────────────────────────────
    const renderPage = (page, pageIdx, side) => {
        if (!page) {
            return (
                <div className="h-full flex items-center justify-center opacity-10">
                    <span className="material-symbols-outlined text-[#333]" style={{ fontSize: 72 }}>auto_stories</span>
                </div>
            );
        }

        return (
            <div className="h-full flex flex-col relative">
                {/* Red ribbon bookmark */}
                {bookmarks.has(pageIdx) && (
                    <motion.div className="absolute -top-1 z-20" style={{ [side === 'left' ? 'right' : 'left']: 22 }}
                        initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        transition={{ type: 'spring', damping: 10, stiffness: 200 }}>
                        <div className="w-7 h-16 relative" style={{
                            background: 'linear-gradient(180deg, #E50914 0%, #B20710 50%, #8B0610 100%)',
                            clipPath: 'polygon(0 0, 100% 0, 100% 88%, 50% 100%, 0 88%)',
                            filter: 'drop-shadow(1px 2px 4px rgba(0,0,0,0.5))',
                        }}>
                            <div className="absolute top-0 left-0 w-2 h-full rounded-sm" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.2), transparent)' }} />
                        </div>
                    </motion.div>
                )}

                {/* Bookmark toggle */}
                <button onClick={(e) => { e.stopPropagation(); toggleBookmark(pageIdx); }}
                    className="absolute top-3 z-30 size-7 rounded-full flex items-center justify-center opacity-0 group-hover/page:opacity-60 hover:!opacity-100 transition-all duration-200 hover:scale-125"
                    style={{ [side === 'left' ? 'right' : 'left']: 8 }}>
                    <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 20, fontVariationSettings: bookmarks.has(pageIdx) ? "'FILL' 1" : "'FILL' 0" }}>bookmark</span>
                </button>

                {/* Header */}
                <div className="px-6 pt-5 pb-3 border-b border-[#333]/60">
                    <h4 className="text-white font-extrabold text-lg leading-snug tracking-tight">{page.title || `Page ${pageIdx + 1}`}</h4>
                    {page.topic && (
                        <p className="text-[#E50914] text-[10px] uppercase tracking-[0.2em] mt-1 font-bold">{page.topic}</p>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 px-6 py-4 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                    {Array.isArray(page.content) && page.content.map((block, idx) => (
                        <motion.div key={idx} className={`mb-3 ${activeTool === 'highlight' ? 'cursor-crosshair' : ''}`}
                            onClick={() => toggleHighlight(pageIdx, idx)}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 + idx * 0.02, duration: 0.2 }}>

                            {block.type === 'heading' && (
                                <h5 className="text-white font-extrabold text-[17px] mb-2 mt-4 flex items-center gap-2 tracking-tight"
                                    style={getHighlightStyle(pageIdx, idx)}>
                                    <span className="w-1 h-5 rounded-full bg-[#E50914] flex-shrink-0" />
                                    {block.text}
                                </h5>
                            )}
                            {block.type === 'subheading' && (
                                <h6 className="text-[#E87C03] font-bold text-[14px] mb-1 mt-3 uppercase tracking-wider"
                                    style={getHighlightStyle(pageIdx, idx)}>
                                    {block.text}
                                </h6>
                            )}
                            {block.type === 'text' && (
                                <p className="text-[#B3B3B3] text-[13px] leading-[26px]"
                                    style={getHighlightStyle(pageIdx, idx)}>{block.text}</p>
                            )}
                            {block.type === 'textLarge' && (
                                <p className="text-[#E5E5E5] text-[15px] leading-[30px] font-medium"
                                    style={getHighlightStyle(pageIdx, idx)}>{block.text}</p>
                            )}
                            {block.type === 'textSmall' && (
                                <p className="text-[#808080] text-[11px] leading-[20px] italic"
                                    style={getHighlightStyle(pageIdx, idx)}>{block.text}</p>
                            )}
                            {block.type === 'definition' && (
                                <div className="ml-2 my-2 border-l-2 border-[#5DADE2] pl-4" style={getHighlightStyle(pageIdx, idx)}>
                                    <span className="text-[#5DADE2] text-[10px] uppercase tracking-widest font-bold">Definition</span>
                                    <p className="text-[#E5E5E5] text-[13px] leading-[24px] mt-1 font-medium">{block.text}</p>
                                </div>
                            )}
                            {block.type === 'bullet' && (
                                <div className="flex items-start gap-3 mb-1.5 ml-1" style={getHighlightStyle(pageIdx, idx)}>
                                    <span className="text-[#E50914] mt-1.5 text-[6px]">&#9632;</span>
                                    <p className="text-[#B3B3B3] text-[13px] leading-[24px]">{block.text}</p>
                                </div>
                            )}
                            {block.type === 'numberedList' && (
                                <div className="flex items-start gap-3 mb-1.5 ml-1" style={getHighlightStyle(pageIdx, idx)}>
                                    <span className="text-[#E50914] text-[14px] font-black mt-0.5 min-w-[20px] text-center">{block.num || idx}.</span>
                                    <p className="text-[#B3B3B3] text-[13px] leading-[24px]">{block.text}</p>
                                </div>
                            )}
                            {block.type === 'code' && (
                                <pre className="bg-[#0A0A0A] text-[#46D369] text-[11px] rounded-lg p-4 overflow-x-auto ml-2 my-3 border border-[#2E2E2E] leading-5"
                                    style={{ fontFamily: "'Fira Code', 'Courier New', monospace" }}>{block.text}</pre>
                            )}
                            {block.type === 'highlight' && (
                                <div className="bg-[#E50914]/8 border-l-[3px] border-[#E50914] px-4 py-3 rounded-r-lg ml-1 my-3">
                                    <p className="text-[#E5E5E5] text-[13px] font-semibold leading-[24px] italic">{block.text}</p>
                                </div>
                            )}
                            {block.type === 'important' && (
                                <div className="bg-[#E87C03]/8 border border-[#E87C03]/25 rounded-lg px-4 py-3 ml-1 my-3 flex items-start gap-3">
                                    <span className="material-symbols-outlined text-[#E87C03] mt-0.5" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>warning</span>
                                    <p className="text-[#E5E5E5] text-[13px] font-semibold leading-[24px]">{block.text}</p>
                                </div>
                            )}
                            {block.type === 'formula' && (
                                <div className="bg-[#0A0A0A] border border-[#333] rounded-lg px-5 py-4 text-center ml-1 my-3">
                                    <code className="text-[#E87C03] text-base font-bold" style={{ fontFamily: "'Fira Code', monospace" }}>{block.text}</code>
                                </div>
                            )}
                            {block.type === 'example' && (
                                <div className="bg-[#46D369]/6 border-l-[3px] border-[#46D369] px-4 py-3 rounded-r-lg ml-1 my-3">
                                    <p className="text-[#46D369] text-[10px] uppercase tracking-widest font-bold mb-1.5">Example</p>
                                    <p className="text-[#E5E5E5] text-[13px] leading-[24px]">{block.text}</p>
                                </div>
                            )}
                            {block.type === 'diagram' && (() => {
                                // Auto-extract keywords from text to build visual nodes if no nodes provided
                                let diagramNodes = block.nodes;
                                const diagramType = block.diagramType || (block.label?.toLowerCase().includes('tree') ? 'tree' : block.label?.toLowerCase().includes('heatmap') ? 'heatmap' : 'flow');
                                const nodeColors = ['#E50914', '#E87C03', '#46D369', '#5DADE2', '#AF7AC5', '#F4D03F'];

                                if (!diagramNodes && block.text) {
                                    // Extract known CS/technical terms only — not generic words
                                    const knownTerms = block.text.match(/(?:Hash Table|Binary Search Tree|AVL Tree|Red-Black Tree|B-Tree|B\+ Tree|Linked List|Doubly Linked List|Circular List|Array|Stack|Queue|Priority Queue|Deque|Graph|Directed Graph|Undirected Graph|Heap|Min Heap|Max Heap|Trie|Segment Tree|Fenwick Tree|Skip List|Bloom Filter|Matrix|Vector|Set|Map|HashMap|TreeMap|Database|SQL|NoSQL|REST API|HTTP|TCP|UDP|DNS|Load Balancer|Cache|CDN|Microservice|Monolith|Docker|Kubernetes|Lambda|S3|DynamoDB|API Gateway|Neural Network|CNN|RNN|Transformer|LSTM|GAN|Gradient Descent|Backpropagation|Regression|Classification|Clustering|Encapsulation|Abstraction|Polymorphism|Inheritance|Interface|Abstract Class|Constructor|Destructor|Method Overriding|Method Overloading|Virtual Function|Object|Class|Instance|Module|Package|Function|Variable|Constant|Pointer|Reference|Recursion|Iteration|Sorting|Searching|Dynamic Programming|Greedy|Divide and Conquer|Backtracking|BFS|DFS|Dijkstra|Bellman-Ford|Floyd-Warshall|Kruskal|Prim|Topological Sort|Binary Search|Linear Search|Merge Sort|Quick Sort|Bubble Sort|Insertion Sort|Selection Sort|Heap Sort|Radix Sort|Counting Sort|Normalization|Denormalization|ACID|JOIN|Index|Primary Key|Foreign Key|Transaction|Deadlock|Mutex|Semaphore|Thread|Process|Context Switch|Virtual Memory|Paging|Segmentation|File System|Scheduling|Round Robin|FIFO|LRU|LFU)/gi);
                                    if (knownTerms && knownTerms.length >= 2) {
                                        diagramNodes = [...new Set(knownTerms.map(t => t.trim()))].slice(0, 6);
                                    }
                                }

                                return (
                                    <div className="bg-[#0A0A0A] border border-[#2E2E2E] rounded-lg overflow-hidden ml-1 my-3">
                                        {/* Header */}
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2E2E2E] bg-[#141414]">
                                            <span className="material-symbols-outlined text-[#5DADE2]" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                                                {diagramType === 'tree' ? 'account_tree' : diagramType === 'heatmap' ? 'grid_view' : 'schema'}
                                            </span>
                                            <span className="text-[#5DADE2] text-[11px] uppercase tracking-widest font-bold">{block.label || 'Diagram'}</span>
                                        </div>

                                        {/* Diagram body */}
                                        <div className="p-4">
                                            {diagramNodes ? (
                                                diagramType === 'tree' ? (
                                                    /* Tree layout */
                                                    <div className="flex flex-col items-center gap-1">
                                                        {/* Root */}
                                                        <div className="px-4 py-2 rounded-lg border-2 text-center" style={{ borderColor: nodeColors[0], backgroundColor: nodeColors[0] + '15' }}>
                                                            <p className="text-xs font-bold" style={{ color: nodeColors[0] }}>{diagramNodes[0]}</p>
                                                        </div>
                                                        <div className="w-px h-4 bg-[#444]" />
                                                        {/* Children */}
                                                        <div className="flex items-start justify-center gap-6 flex-wrap">
                                                            {diagramNodes.slice(1).map((node, ni) => (
                                                                <div key={ni} className="flex flex-col items-center gap-1">
                                                                    <div className="w-px h-3 bg-[#444]" />
                                                                    <div className="px-3 py-1.5 rounded border text-center" style={{ borderColor: nodeColors[(ni + 1) % nodeColors.length] + '60', backgroundColor: nodeColors[(ni + 1) % nodeColors.length] + '10' }}>
                                                                        <p className="text-[10px] font-bold" style={{ color: nodeColors[(ni + 1) % nodeColors.length] }}>{node}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : diagramType === 'heatmap' ? (
                                                    /* Heatmap grid */
                                                    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(diagramNodes.length, 4)}, 1fr)` }}>
                                                        {diagramNodes.map((node, ni) => (
                                                            <div key={ni} className="rounded p-2 text-center" style={{ backgroundColor: nodeColors[ni % nodeColors.length] + '20', border: `1px solid ${nodeColors[ni % nodeColors.length]}40` }}>
                                                                <p className="text-[10px] font-bold" style={{ color: nodeColors[ni % nodeColors.length] }}>{node}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    /* Flow diagram (default) */
                                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                        {diagramNodes.map((node, ni) => (
                                                            <div key={ni} className="flex items-center gap-1.5">
                                                                <div className="px-3 py-2 rounded-lg border text-center min-w-[70px]"
                                                                    style={{ borderColor: nodeColors[ni % nodeColors.length] + '50', backgroundColor: nodeColors[ni % nodeColors.length] + '12' }}>
                                                                    <p className="text-[10px] font-bold" style={{ color: nodeColors[ni % nodeColors.length] }}>{node}</p>
                                                                </div>
                                                                {ni < diagramNodes.length - 1 && (
                                                                    <span className="material-symbols-outlined text-[#444]" style={{ fontSize: 14 }}>arrow_forward</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )
                                            ) : (
                                                /* No nodes at all — show description nicely */
                                                <p className="text-[#B3B3B3] text-[12px] leading-[22px] text-center">{block.text}</p>
                                            )}

                                            {/* Description below diagram */}
                                            {block.text && diagramNodes && (
                                                <p className="text-[#808080] text-[11px] text-center mt-3 italic leading-[18px]">{block.text}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                            {block.type === 'keyTerm' && (
                                <div className="flex items-start gap-2 ml-2 my-2" style={getHighlightStyle(pageIdx, idx)}>
                                    <span className="text-[#AF7AC5] font-black text-sm mt-0.5">&#8227;</span>
                                    <div>
                                        <span className="text-[#AF7AC5] font-bold text-[13px]">{block.term}</span>
                                        <span className="text-[#808080] text-[13px]"> — {block.text}</span>
                                    </div>
                                </div>
                            )}
                            {block.type === 'quote' && (
                                <div className="ml-2 my-3 pl-4 border-l-2 border-[#555]">
                                    <p className="text-[#808080] text-[14px] italic leading-[26px]">"{block.text}"</p>
                                    {block.author && <p className="text-[#555] text-[11px] mt-1">— {block.author}</p>}
                                </div>
                            )}
                        </motion.div>
                    ))}

                    {typeof page.content === 'string' && (
                        <p className="text-[#B3B3B3] text-[13px] leading-[26px] whitespace-pre-wrap">{page.content}</p>
                    )}

                    {/* User pen notes area — always visible when pen tool active */}
                    {activeTool === 'pen' && (
                        <div className="mt-4 border-t border-[#333] pt-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-[#E87C03]" style={{ fontSize: 14 }}>edit</span>
                                <span className="text-[#E87C03] text-[10px] uppercase tracking-widest font-bold">Your Notes</span>
                            </div>
                            <textarea
                                placeholder="Write your notes here... (click to start typing)"
                                value={penNotes[pageIdx] || ''}
                                onChange={(e) => setPenNotes(prev => ({ ...prev, [pageIdx]: e.target.value }))}
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                autoFocus
                                className="w-full bg-[#0A0A0A] border border-[#333] rounded-lg text-[#E87C03] text-[14px] italic leading-[28px] resize-y focus:outline-none focus:border-[#E87C03]/40 min-h-[100px] p-3 placeholder-[#444]"
                                style={{ fontFamily: "'Caveat', cursive, 'Manrope', sans-serif" }}
                            />
                        </div>
                    )}

                    {/* Show saved pen notes */}
                    {activeTool !== 'pen' && penNotes[pageIdx] && (
                        <div className="mt-4 border-t border-[#333]/40 pt-3">
                            <p className="text-[#E87C03] text-[13px] italic leading-[26px] whitespace-pre-wrap"
                                style={{ fontFamily: "'Caveat', cursive, 'Manrope', sans-serif" }}>
                                {penNotes[pageIdx]}
                            </p>
                        </div>
                    )}
                </div>

                {/* Page number */}
                <div className="px-6 py-2 text-center">
                    <span className="text-[#444] text-[11px] font-bold">— {pageIdx + 1} —</span>
                </div>
            </div>
        );
    };

    // ─── Page turn variants ────────────────────────────────────────────────
    const rightPageVariants = {
        enter: (dir) => dir > 0 ? { rotateY: -180, opacity: 0.6 } : { opacity: 0 },
        center: (dir) => ({ rotateY: 0, opacity: 1,
            transition: dir > 0 ? { rotateY: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.4 } } : { opacity: { duration: 0.25 } },
        }),
        exit: (dir) => dir > 0
            ? { rotateY: 180, opacity: 0.6, transition: { rotateY: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.4, delay: 0.3 } } }
            : { opacity: 0, transition: { duration: 0.15 } },
    };
    const leftPageVariants = {
        enter: (dir) => dir < 0 ? { rotateY: 180, opacity: 0.6 } : { opacity: 0 },
        center: (dir) => ({ rotateY: 0, opacity: 1,
            transition: dir < 0 ? { rotateY: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.4 } } : { opacity: { duration: 0.25 } },
        }),
        exit: (dir) => dir < 0
            ? { rotateY: -180, opacity: 0.6, transition: { rotateY: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.4, delay: 0.3 } } }
            : { opacity: 0, transition: { duration: 0.15 } },
    };

    return (
        <div className="flex gap-4 h-full">
            {/* ═══ TOC ═══ */}
            <AnimatePresence>
                {showTOC && (
                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 220, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="flex-shrink-0 overflow-hidden">
                        <div className="w-[220px] h-full bg-[#0A0A0A] rounded-lg flex flex-col overflow-hidden border border-[#2E2E2E]">
                            <div className="p-4 border-b border-[#2E2E2E]">
                                <h4 className="text-[#E50914] text-xs font-bold uppercase tracking-[0.15em]">Contents</h4>
                            </div>
                            <div className="flex-1 p-3 overflow-y-auto space-y-0.5" style={{ scrollbarWidth: 'thin' }}>
                                {pages.map((p, idx) => (
                                    <motion.button key={idx} onClick={() => goToPage(idx)}
                                        initial={{ x: -15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.025 }}
                                        className={`w-full text-left px-3 py-2 rounded text-[11px] transition-all flex items-center gap-2 ${
                                            idx >= currentSpread && idx <= currentSpread + 1
                                                ? 'bg-[#E50914]/15 text-[#E50914]' : 'text-[#808080] hover:text-white hover:bg-white/5'
                                        }`}>
                                        {bookmarks.has(idx) && <span className="w-1.5 h-4 bg-[#E50914] rounded-sm flex-shrink-0" />}
                                        <span className="text-[#444] text-[10px] font-bold w-4">{idx + 1}</span>
                                        <span className="truncate">{p.title || `Page ${idx + 1}`}</span>
                                    </motion.button>
                                ))}
                            </div>
                            {bookmarks.size > 0 && (
                                <div className="p-3 border-t border-[#2E2E2E]">
                                    <p className="text-[#E50914] text-[10px] font-bold uppercase tracking-wider mb-2 px-1">Bookmarks</p>
                                    {[...bookmarks].sort((a, b) => a - b).map(idx => (
                                        <button key={idx} onClick={() => goToPage(idx)}
                                            className="w-full text-left px-3 py-1.5 text-[11px] text-[#E50914]/60 hover:text-[#E50914] transition-all truncate flex items-center gap-2">
                                            <span className="w-1.5 h-3 bg-[#E50914] rounded-sm flex-shrink-0" />
                                            {pages[idx]?.title || `Page ${idx + 1}`}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ Book ═══ */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <motion.button onClick={() => setShowTOC(!showTOC)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            className={`size-9 rounded-lg flex items-center justify-center transition-all ${showTOC ? 'bg-[#E50914]/15 text-[#E50914]' : 'bg-[#1E1E1E] text-[#808080] hover:text-white'}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>toc</span>
                        </motion.button>
                        <h3 className="text-white font-bold text-base">{title}</h3>

                        {/* Divider */}
                        <div className="w-px h-5 bg-[#333] mx-1" />

                        {/* Tools */}
                        <motion.button onClick={() => setActiveTool(activeTool === 'highlight' ? null : 'highlight')}
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            className={`size-9 rounded-lg flex items-center justify-center transition-all ${activeTool === 'highlight' ? 'bg-[#FACC15]/15 text-[#FACC15]' : 'bg-[#1E1E1E] text-[#808080] hover:text-white'}`}
                            title="Highlighter">
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>ink_highlighter</span>
                        </motion.button>

                        <motion.button onClick={() => setActiveTool(activeTool === 'pen' ? null : 'pen')}
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            className={`size-9 rounded-lg flex items-center justify-center transition-all ${activeTool === 'pen' ? 'bg-[#E87C03]/15 text-[#E87C03]' : 'bg-[#1E1E1E] text-[#808080] hover:text-white'}`}
                            title="Pen / Write Notes">
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                        </motion.button>

                        <motion.button onClick={() => { setActiveTool(null); setHighlights({}); }}
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            className="size-9 rounded-lg flex items-center justify-center bg-[#1E1E1E] text-[#808080] hover:text-white transition-all"
                            title="Clear highlights">
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>ink_eraser</span>
                        </motion.button>

                        {/* Highlight color picker (visible when highlight active) */}
                        {activeTool === 'highlight' && (
                            <div className="flex items-center gap-1 ml-1">
                                {HIGHLIGHT_COLORS.map(c => (
                                    <button key={c.id} onClick={() => setHighlightColor(c)}
                                        className={`size-5 rounded-full border-2 transition-all ${highlightColor.id === c.id ? 'scale-125 border-white' : 'border-transparent hover:scale-110'}`}
                                        style={{ backgroundColor: c.border }} title={c.label} />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {onUploadRequest && (
                            <button onClick={onUploadRequest}
                                className="flex items-center gap-1.5 text-[11px] text-[#808080] hover:text-[#E50914] transition-colors font-bold">
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload_file</span>
                                Upload
                            </button>
                        )}
                        <span className="text-[11px] text-[#444] font-bold">
                            {leftIdx + 1}–{Math.min(rightIdx + 1, totalPages)} / {totalPages}
                        </span>
                    </div>
                </div>

                {/* Book spread */}
                <div className="flex-1 relative" style={{ perspective: 2000 }}>
                    <div className="absolute inset-x-6 bottom-0 h-6 bg-black/30 rounded-[50%] blur-md" />
                    <div className="relative h-full flex rounded-lg overflow-visible"
                        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.3)' }}>

                        <div className="absolute left-1/2 top-0 bottom-0 w-5 -ml-2.5 z-30 pointer-events-none"
                            style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.3) 100%)' }} />

                        {/* LEFT PAGE */}
                        <div className="w-1/2 relative overflow-hidden" style={{
                            background: '#1E1E1E',
                            backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, transparent 5%), repeating-linear-gradient(transparent, transparent 27px, rgba(255,255,255,0.025) 27px, rgba(255,255,255,0.025) 28px)',
                            backgroundPosition: '0 65px', borderRight: '1px solid rgba(255,255,255,0.04)', transformStyle: 'preserve-3d',
                        }}>
                            <div className="absolute inset-y-0 right-0 w-12 pointer-events-none z-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.1))' }} />
                            <AnimatePresence mode="wait" custom={flipDir}>
                                <motion.div key={`L-${leftIdx}`} custom={flipDir} variants={leftPageVariants}
                                    initial="enter" animate="center" exit="exit" className="h-full group/page"
                                    style={{ transformOrigin: 'right center', transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}>
                                    {renderPage(leftPage, leftIdx, 'left')}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* RIGHT PAGE */}
                        <div className="w-1/2 relative overflow-hidden" style={{
                            background: '#1A1A1A',
                            backgroundImage: 'linear-gradient(90deg, transparent 94%, rgba(255,255,255,0.01) 100%), repeating-linear-gradient(transparent, transparent 27px, rgba(255,255,255,0.02) 27px, rgba(255,255,255,0.02) 28px)',
                            backgroundPosition: '0 65px', transformStyle: 'preserve-3d',
                        }}>
                            <div className="absolute inset-y-0 left-0 w-12 pointer-events-none z-10" style={{ background: 'linear-gradient(270deg, transparent, rgba(0,0,0,0.08))' }} />
                            <AnimatePresence mode="wait" custom={flipDir}>
                                <motion.div key={`R-${rightIdx}`} custom={flipDir} variants={rightPageVariants}
                                    initial="enter" animate="center" exit="exit" className="h-full group/page"
                                    style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}>
                                    {renderPage(rightPage, rightIdx, 'right')}
                                </motion.div>
                            </AnimatePresence>

                            <div className="absolute bottom-0 right-0 z-20 cursor-pointer" style={{ width: 55, height: 55 }}
                                onMouseEnter={() => setShowCorner(true)} onMouseLeave={() => setShowCorner(false)} onClick={flipNext}>
                                <motion.div className="absolute bottom-0 right-0 pointer-events-none"
                                    animate={{ width: showCorner ? 45 : 16, height: showCorner ? 45 : 16 }}
                                    transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                                    style={{
                                        background: 'linear-gradient(135deg, transparent 42%, #2A2A2A 43%, #333 48%, #1E1E1E 100%)',
                                        borderTopLeftRadius: showCorner ? 6 : 3,
                                        filter: showCorner ? 'drop-shadow(-2px -2px 6px rgba(0,0,0,0.4))' : 'drop-shadow(-1px -1px 3px rgba(0,0,0,0.2))',
                                    }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-4">
                    <motion.button onClick={flipPrev} disabled={currentSpread <= 0}
                        whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded text-[#808080] text-sm font-semibold disabled:opacity-20 disabled:cursor-not-allowed hover:bg-[#1E1E1E] hover:text-white transition-all">
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_left</span>
                        Previous
                    </motion.button>

                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: Math.ceil(totalPages / 2) }).map((_, i) => {
                            const spreadIdx = i * 2;
                            return (
                                <motion.button key={i} onClick={() => goToPage(spreadIdx)} whileHover={{ scale: 1.4 }}
                                    className={`rounded-full transition-all duration-300 ${spreadIdx === currentSpread ? 'w-6 h-2.5 bg-[#E50914]' : 'w-2.5 h-2.5 bg-[#333] hover:bg-[#555]'}`} />
                            );
                        })}
                    </div>

                    <motion.button onClick={flipNext} disabled={rightIdx >= totalPages - 1}
                        whileHover={{ x: 3 }} whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded text-[#808080] text-sm font-semibold disabled:opacity-20 disabled:cursor-not-allowed hover:bg-[#1E1E1E] hover:text-white transition-all">
                        Next
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_right</span>
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
