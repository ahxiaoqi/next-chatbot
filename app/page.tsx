'use client';

import React, { useState, useCallback, useRef, useEffect, createContext, useContext } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    addEdge,
    Connection,
    Edge,
    Node,
    NodeTypes,
    useNodesState,
    useEdgesState,
    Position,
    MarkerType,
    Handle
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Maximize2, Bug } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// 实际API调用
const callChatAPI = async (message: string, upstreamNodes?: Array<{node: any, connectionType: string}>): Promise<string> => {
    // 格式化上游节点的对话历史
    const formatted = upstreamNodes?.flatMap(node => {
        const { question, answer } = node.node.data;
        return [
            ["human", question],
            ["ai", answer],
        ];
    }) || [];

    try {
        const response = await fetch('/api/langchain', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                history: formatted,
                text: message
            }),
        });

        if (!response.ok) {
            throw new Error(`API 错误! 状态码: ${response.status}`);
        }

        const data = await response.json();
        return data.result  || '无法获取回复';
    } catch (error) {
        console.error('API调用失败:', error);
        throw new Error('无法连接到AI服务，请稍后再试');
    }
};

// 创建一个Context来传递节点操作函数
const NodeActionsContext = createContext({
    onContinueNode: (nodeId: string) => {},
    onForkNode: (nodeId: string) => {},
    onDeleteNode: (nodeId: string) => {},
    onDebugNode: (nodeId: string) => {},
    onViewDetails: (nodeId: string) => {},
});

// 自定义节点组件
const ChatNode = ({ id, data, isConnectable }) => {
    const nodeActions = useContext(NodeActionsContext);

    const handleContinueClick = (e) => {
        e.stopPropagation();
        if (data.isLoading) return; // 如果正在加载，不执行操作
        console.log('继续按钮被点击', id);
        nodeActions.onContinueNode(id);
    };

    const handleForkClick = (e) => {
        e.stopPropagation();
        if (data.isLoading) return; // 如果正在加载，不执行操作
        console.log('Fork按钮被点击', id);
        nodeActions.onForkNode(id);
    };

    const handleDebugClick = (e) => {
        e.stopPropagation();
        console.log('调试按钮被点击', id);
        nodeActions.onDebugNode(id);
    };

    const handleNodeClick = (e) => {
        console.log('节点被点击', id);
        nodeActions.onViewDetails(id);
    };

    // 截取问题和回答内容
    const truncateText = (text, maxLength = 100) => {
        if (!text) return '';
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
    };

    return (
        <div
            className="bg-white border border-gray-200 rounded-md p-4 shadow-md w-[350px] h-[220px] overflow-hidden cursor-pointer"
            onClick={handleNodeClick}
        >
            <Handle
                type="target"
                position={Position.Top}
                id="target-top"
                style={{ background: '#555', width: 10, height: 10 }}
                isConnectable={isConnectable}
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="source-bottom"
                style={{ background: '#555', width: 10, height: 10 }}
                // isConnectable={false}  // 设置为false禁止用户手动连线
            />
            <Handle
                type="source"
                position={Position.Right}
                id="source-right"
                style={{ background: '#555', width: 10, height: 10 }}
                // isConnectable={false}  // 设置为false禁止用户手动连线
            />

            <div className="absolute top-2 right-2 flex gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        nodeActions.onViewDetails(id);
                    }}
                    className="h-6 w-6 p-0 text-gray-500 hover:bg-blue-100 hover:text-blue-700"
                    title="查看详情"
                >
                    <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDebugClick}
                    className="h-6 w-6 p-0 text-blue-500 hover:bg-blue-100 hover:text-blue-700"
                    title="调试节点关系"
                >
                    <Bug className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        nodeActions.onDeleteNode(id);
                    }}
                    className="h-6 w-6 p-0 text-gray-500 hover:bg-red-100 hover:text-red-500">
                    ✕
                </Button>
            </div>

            <div className="mb-3 max-h-[70px] overflow-hidden">
                <h3 className="font-bold text-gray-800">Q:</h3>
                <p className="text-sm text-gray-700 line-clamp-3">{truncateText(data.question, 150)}</p>
            </div>

            <div className="border-t pt-2 max-h-[80px] overflow-hidden">
                <h3 className="font-bold text-gray-800">A:</h3>
                {data.isLoading ? (
                    <div className="flex items-center justify-center p-4">
                        <div className="relative">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <div className="absolute inset-0 h-full w-full animate-ping rounded-full bg-blue-400 opacity-20"></div>
                        </div>
                    </div>
                ) : (
                    <div className="prose prose-sm max-w-none line-clamp-3">
                        <ReactMarkdown>{truncateText(data.answer, 150)}</ReactMarkdown>
                    </div>
                )}
            </div>

            <div className="flex justify-between mt-2 absolute bottom-3 left-3 right-3">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleContinueClick}
                    disabled={data.isLoading}
                    className={`${data.isLoading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-black text-white hover:bg-gray-800'}`}>
                    继续
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleForkClick}
                    disabled={data.isLoading}
                    className={`${data.isLoading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'}`}>
                    Fork
                </Button>
            </div>
        </div>
    );
};

// 节点类型
const nodeTypes = {
    chatNode: ChatNode,
};

export default function ChatBotPage() {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [actionType, setActionType] = useState<'create' | 'continue' | 'fork'>('create');
    const [sourceNodeId, setSourceNodeId] = useState<string | null>(null);
    const nodeIdCounter = useRef(1);
    const reactFlowWrapper = useRef(null);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const nodeRefsMap = useRef<Map<string, any>>(new Map());

    // 添加边的选择状态和菜单状态
    const [selectedEdge, setSelectedEdge] = useState(null);
    const [edgeContextMenu, setEdgeContextMenu] = useState({ visible: false, x: 0, y: 0 });

    const [debugInfo, setDebugInfo] = useState({
        lastAction: '',
        lastNodeId: '',
    });

    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedNode, setSelectedNode] = useState(null);

    const checkNodeExists = (nodeId: string) => {
        if (nodeRefsMap.current.has(nodeId)) {
            return true;
        }
        const found = nodes.some(node => node.id === nodeId);
        console.log(`节点存在性检查 - ID: ${nodeId}, 结果: ${found ? '存在' : '不存在'}`);
        console.log('当前所有节点ID:', nodes.map(n => n.id));
        return found;
    };

    const getUpstreamNodes = useCallback((nodeId: string): Array<{ node: any, connectionType: string }> => {
        const result: Array<{ node: any, connectionType: string }> = [];
        const currentNode = nodes.find(n => n.id === nodeId);
        if (currentNode) {
            result.push({ node: currentNode, connectionType: 'self' });
            const incomingEdges = edges.filter(edge => edge.target === nodeId);
            for (const edge of incomingEdges) {
                const connectionType = edge.style?.stroke === '#F56565' ? 'fork' : 'continue';
                const sourceNode = nodes.find(n => n.id === edge.source);
                if (sourceNode) {
                    result.push({ node: sourceNode, connectionType });
                    const sourceUpstream = getUpstreamNodes(sourceNode.id)
                        .filter(item => item.connectionType !== 'self');
                    result.push(...sourceUpstream);
                }
            }
        }
        return result;
    }, [nodes, edges]);

    const showNodeDebugInfo = useCallback((nodeId: string) => {
        const upstreamNodes = getUpstreamNodes(nodeId);
        console.log('上游节点信息:', upstreamNodes);
        if (upstreamNodes.length === 0) {
            alert(`节点 ${nodeId} 不存在或没有上游节点。`);
            return;
        }
        const formattedInfo = upstreamNodes.map((item, index) => {
            const { node, connectionType } = item;
            const connectionSymbol =
                connectionType === 'self' ? '🟢 当前节点' :
                    connectionType === 'fork' ? '🔴 Fork连接' :
                        connectionType === 'continue' ? '⚫ 继续连接' : '❓ 未知连接';
            return `${index + 1}. ${connectionSymbol} 节点ID: ${node.id}
位置: (${Math.round(node.position.x)}, ${Math.round(node.position.y)})
问题: "${node.data.question.substring(0, 50)}${node.data.question.length > 50 ? '...' : ''}"
回答长度: ${node.data.answer ? node.data.answer.length : 0}字符`;
        }).join('\n\n-----------------\n\n');
        alert(`节点 ${nodeId} 的关系图 (共 ${upstreamNodes.length} 个节点):
    
${formattedInfo}`);
    }, [getUpstreamNodes]);

    const checkForCycle = useCallback((sourceId: string, targetId: string): boolean => {
        if (sourceId === targetId) return true;

        const upstreamNodeIds = new Set();
        const checkUpstream = (nodeId: string) => {
            const incomingEdges = edges.filter(e => e.target === nodeId);
            for (const edge of incomingEdges) {
                if (edge.source === sourceId) return true;
                upstreamNodeIds.add(edge.source);
                if (checkUpstream(edge.source)) return true;
            }
            return false;
        };

        return checkUpstream(targetId);
    }, [edges]);

    const hasParentNode = useCallback((nodeId: string): boolean => {
        return edges.some(edge => edge.target === nodeId && edge.targetHandle === 'target-top');
    }, [edges]);

    const createNode = useCallback((question: string, position, sourceId = null, actionType = 'create') => {
        console.log('创建节点:', { question, position, sourceId, actionType });
        const nodeId = `node_${nodeIdCounter.current}`;
        nodeIdCounter.current += 1;

        const newNode = {
            id: nodeId,
            type: 'chatNode',
            position,
            data: {
                question,
                answer: '',
                isLoading: true,
            },
        };

        nodeRefsMap.current.set(nodeId, newNode);
        setNodes(prevNodes => [...prevNodes, newNode]);
        if (sourceId) {
            if (checkForCycle(sourceId, nodeId)) {
                alert('警告：检测到可能的环形连接');
            }

            const sourceHandleId = actionType === 'fork' ? 'source-right' : 'source-bottom';
            const targetHandleId = 'target-top';
            const sourcePosition = actionType === 'fork' ? Position.Right : Position.Bottom;
            const targetPosition = Position.Top;
            const newEdge = {
                id: `edge-${sourceId}-${nodeId}`,
                source: sourceId,
                target: nodeId,
                sourceHandle: sourceHandleId,
                targetHandle: targetHandleId,
                type: 'default',
                animated: true,
                style: {
                    stroke: actionType === 'fork' ? '#F56565' : '#000000',
                    strokeWidth: actionType === 'fork' ? 3 : 2
                },
                sourcePosition,
                targetPosition,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: actionType === 'fork' ? '#F56565' : '#000000',
                    width: 20,
                    height: 20,
                },
                data: { actionType },
            };
            console.log('创建新边:', newEdge);
            setEdges(eds => [...eds, newEdge]);
        }

        // 返回创建的节点ID，以便后续使用
        return nodeId;
    }, [setNodes, setEdges, checkForCycle]);

    const handleContextMenu = useCallback((event) => {
        // 判断右键点击是否来自边或节点
        const target = event.target;
        // 检查是否点击在边或节点上，react-flow为边添加了特定的类名
        const isEdgeClick = target.classList && (
            target.classList.contains('react-flow__edge') ||
            target.parentElement?.classList.contains('react-flow__edge') ||
            target.closest('.react-flow__edge') !== null
        );

        // 如果是在边上点击，则不触发创建节点对话框
        if (isEdgeClick) {
            return;
        }

        event.preventDefault();
        if (reactFlowInstance) {
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });
            setContextMenuPosition(position);
            setActionType('create');
            setSourceNodeId(null);
            setUserInput('');
            setDialogOpen(true);
        }
    }, [reactFlowInstance]);

    const handleContinue = useCallback((nodeId) => {
        console.log('处理继续操作，节点ID:', nodeId);
        setDebugInfo({
            lastAction: '继续',
            lastNodeId: nodeId,
        });
        const nodeFromCache = nodeRefsMap.current.get(nodeId);
        const nodeFromState = nodes.find(n => n.id === nodeId);
        const sourceNode = nodeFromCache || nodeFromState;
        console.log('缓存中的节点:', nodeFromCache ? '找到' : '未找到');
        console.log('状态中的节点:', nodeFromState ? '找到' : '未找到');
        console.log('所有节点IDs:', nodes.map(n => n.id).join(', '));
        if (sourceNode) {
            setSourceNodeId(nodeId);
            setActionType('continue');
            setUserInput('');
            setDialogOpen(true);
        } else {
            console.error('找不到节点:', nodeId);
            const nodeInfo = nodes.map(n =>
                `ID: ${n.id}, 位置: (${Math.round(n.position.x)}, ${Math.round(n.position.y)})`
            ).join('\n');
            const cacheInfo = Array.from(nodeRefsMap.current.keys()).map(id =>
                `ID: ${id}`
            ).join(', ');
            alert(`操作失败：找不到节点 ${nodeId}
      
当前存在的节点 (${nodes.length}个):
${nodeInfo || "无节点"}

缓存中的节点IDs (${nodeRefsMap.current.size}个):
${cacheInfo || "无节点"}

请刷新页面再试。`);
        }
    }, [nodes]);

    const handleFork = useCallback((nodeId) => {
        console.log('处理Fork操作，节点ID:', nodeId);
        setDebugInfo({
            lastAction: 'Fork',
            lastNodeId: nodeId,
        });
        const nodeFromCache = nodeRefsMap.current.get(nodeId);
        const nodeFromState = nodes.find(n => n.id === nodeId);
        const sourceNode = nodeFromCache || nodeFromState;
        console.log('缓存中的节点:', nodeFromCache ? '找到' : '未找到');
        console.log('状态中的节点:', nodeFromState ? '找到' : '未找到');
        if (sourceNode) {
            setSourceNodeId(nodeId);
            setActionType('fork');
            setUserInput('');
            setDialogOpen(true);
        } else {
            console.error('找不到节点:', nodeId);
            const nodeInfo = nodes.map(n =>
                `ID: ${n.id}, 位置: (${Math.round(n.position.x)}, ${Math.round(n.position.y)})`
            ).join('\n');
            const cacheInfo = Array.from(nodeRefsMap.current.keys()).map(id =>
                `ID: ${id}`
            ).join(', ');
            alert(`操作失败：找不到节点 ${nodeId}
      
当前存在的节点 (${nodes.length}个):
${nodeInfo || "无节点"}

缓存中的节点IDs (${nodeRefsMap.current.size}个):
${cacheInfo || "无节点"}

请刷新页面再试。`);
        }
    }, [nodes]);

    const handleDeleteNode = useCallback((nodeId) => {
        console.log('删除节点:', nodeId);
        const connectedEdgeIds = edges.filter(
            e => e.source === nodeId || e.target === nodeId
        ).map(e => e.id);
        setNodes(nds => {
            const result = nds.filter(node => node.id !== nodeId);
            console.log(`删除节点后，剩余节点数: ${result.length}`);
            return result;
        });
        setEdges(eds => eds.filter(edge => !connectedEdgeIds.includes(edge.id)));
        nodeRefsMap.current.delete(nodeId);
    }, [edges, setNodes, setEdges]);

    const handleViewNodeDetails = useCallback((nodeId) => {
        console.log('查看节点详情:', nodeId);
        const nodeFromCache = nodeRefsMap.current.get(nodeId);
        const nodeFromState = nodes.find(n => n.id === nodeId);
        const node = nodeFromCache || nodeFromState;
        if (node) {
            setSelectedNode(node);
            setDetailDialogOpen(true);
        } else {
            console.error('找不到节点:', nodeId);
        }
    }, [nodes]);

    const onSubmitDialog = useCallback(async () => {
        if (!userInput.trim()) return;
        console.log('提交对话:', {
            userInput,
            actionType,
            sourceNodeId
        });
        setDialogOpen(false);
        let position;
        let sourceNode = null;
        if (actionType === 'create') {
            position = contextMenuPosition;
        } else {
            sourceNode = sourceNodeId ? nodeRefsMap.current.get(sourceNodeId) : null;
            if (!sourceNode) {
                sourceNode = nodes.find(n => n.id === sourceNodeId);
            }
            console.log('找到源节点:', sourceNode ? '是' : '否');
            if (sourceNode) {
                if (actionType === 'continue') {
                    position = {
                        x: sourceNode.position.x,
                        y: sourceNode.position.y + 300,
                    };
                } else if (actionType === 'fork') {
                    position = {
                        x: sourceNode.position.x + 500,
                        y: sourceNode.position.y,
                    };
                }
                console.log('计算新节点位置:', position);
            } else {
                console.error('无法找到源节点:', sourceNodeId);
                const nodeInfo = nodes.map(n =>
                    `ID: ${n.id}, 位置: (${Math.round(n.position.x)}, ${Math.round(n.position.y)}), 问题: "${n.data.question.substring(0, 20)}..."`
                ).join('\n');
                const cacheInfo = Array.from(nodeRefsMap.current.keys()).map(id =>
                    `ID: ${id}`
                ).join(', ');
                alert(`创建节点失败：无法找到源节点 ${sourceNodeId}
        
操作类型: ${actionType}
当前节点数量: ${nodes.length}
当前存在的节点: 
${nodeInfo || "无节点"}

缓存中的节点IDs (${nodeRefsMap.current.size}个):
${cacheInfo || "无节点"}`);
                return;
            }
        }

        // 先创建节点（不包含调用API）
        const nodeId = createNode(userInput, position, sourceNodeId, actionType);

        // 然后在这里调用API并更新节点
        try {
            // 获取上游节点信息
            let upstreamNodes = [];
            if (sourceNodeId) {
                // 首先等待节点被添加到状态中
                await new Promise(resolve => setTimeout(resolve, 0));
                // upstreamNodes = getUpstreamNodes(sourceNodeId);
                upstreamNodes = [...getUpstreamNodes(sourceNodeId)].reverse();
            }

            console.log('调用API获取回复:', userInput);
            const answer = await callChatAPI(userInput, upstreamNodes);

            // 更新节点状态
            setNodes(nds =>
                nds.map(node => {
                    if (node.id === nodeId) {
                        const updatedNode = {
                            ...node,
                            data: {
                                ...node.data,
                                answer,
                                isLoading: false,
                            },
                        };
                        nodeRefsMap.current.set(nodeId, updatedNode);
                        return updatedNode;
                    }
                    return node;
                })
            );
        } catch (error) {
            console.error('API调用失败:', error);
            setNodes(nds =>
                nds.map(node => {
                    if (node.id === nodeId) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                answer: '获取回答时出错，请重试。',
                                isLoading: false,
                            },
                        };
                    }
                    return node;
                })
            );
        }
    }, [userInput, actionType, sourceNodeId, contextMenuPosition, nodes, createNode, getUpstreamNodes]);

    useEffect(() => {
        nodes.forEach(node => {
            nodeRefsMap.current.set(node.id, node);
        });
        Array.from(nodeRefsMap.current.keys()).forEach(id => {
            if (!nodes.some(node => node.id === id)) {
                nodeRefsMap.current.delete(id);
            }
        });
        console.log('节点状态更新:', nodes.length, '个节点');
        console.log('缓存状态更新:', nodeRefsMap.current.size, '个节点');
    }, [nodes]);

    const onConnect = useCallback((params: Connection) => {
        if (params.targetHandle === 'target-top' && hasParentNode(params.target)) {
            alert('每个节点只能有一个父节点（连接到上方的连接点）');
            return;
        }

        if (checkForCycle(params.source, params.target)) {
            alert('不允许创建环形连接');
            return;
        }

        // 用户手动创建的连接显示为绿色
        const edge = {
            ...params,
            style: {
                stroke: '#4CAF50',  // 绿色
                strokeWidth: 3
            },
            animated: true,
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#4CAF50',  // 绿色
                width: 20,
                height: 20,
            },
            data: { actionType: 'manual' }, // 标记为手动连接
        };

        setEdges(eds => addEdge(edge, eds));
    }, [setEdges, hasParentNode, checkForCycle]);

    useEffect(() => {
        if (edges.length > 0) {
            console.log('当前边状态:', edges);
        }
        if (nodes.length > 1 && edges.length === 0) {
            console.warn('有多个节点但没有边连接，可能存在连线问题');
        }
    }, [edges, nodes]);

    const debugNodes = () => {
        console.log('当前所有节点:', nodes);
        console.log('节点ID列表:', nodes.map(n => n.id));
        console.log('节点缓存:', nodeRefsMap.current);
        const formattedInfo = nodes.map(node => {
            const inCache = nodeRefsMap.current.has(node.id) ? '是' : '否';
            return `节点ID: ${node.id}
位置: (${Math.round(node.position.x)}, ${Math.round(node.position.y)})
类型: ${node.type}
问题: "${node.data.question.substring(0, 30)}${node.data.question.length > 30 ? '...' : ''}"
回答长度: ${node.data.answer ? node.data.answer.length : 0}字符
加载状态: ${node.data.isLoading ? '加载中' : '已加载'}
在缓存中: ${inCache}`
        }).join('\n\n-----------------\n\n');
        const cacheInfo = Array.from(nodeRefsMap.current.keys()).join(', ');
        alert(`当前共有 ${nodes.length} 个节点:
    
${formattedInfo || "当前没有节点"}

缓存中的节点IDs (${nodeRefsMap.current.size}个):
${cacheInfo || "无节点"}`);
    };

    // 定义统一的节点操作函数
    const nodeActions = {
        onContinueNode: useCallback((nodeId: string) => {
            console.log('处理继续操作，节点ID:', nodeId);
            handleContinue(nodeId);
        }, []),

        onForkNode: useCallback((nodeId: string) => {
            console.log('处理Fork操作，节点ID:', nodeId);
            handleFork(nodeId);
        }, []),

        onDeleteNode: useCallback((nodeId: string) => {
            console.log('处理删除操作，节点ID:', nodeId);
            handleDeleteNode(nodeId);
        }, []),

        onDebugNode: useCallback((nodeId: string) => {
            console.log('调试节点关系，节点ID:', nodeId);
            showNodeDebugInfo(nodeId);
        }, []),

        onViewDetails: useCallback((nodeId: string) => {
            console.log('查看节点详情，节点ID:', nodeId);
            handleViewNodeDetails(nodeId);
        }, []),
    };

    useEffect(() => {
        nodeActions.onContinueNode = (nodeId) => handleContinue(nodeId);
        nodeActions.onForkNode = (nodeId) => handleFork(nodeId);
        nodeActions.onDeleteNode = (nodeId) => handleDeleteNode(nodeId);
        nodeActions.onDebugNode = (nodeId) => showNodeDebugInfo(nodeId);
        nodeActions.onViewDetails = (nodeId) => handleViewNodeDetails(nodeId);
    }, [handleContinue, handleFork, handleDeleteNode, showNodeDebugInfo, handleViewNodeDetails]);

    // 处理边的右键点击
    const handleEdgeContextMenu = useCallback((event, edge) => {
        debugger
        event.preventDefault();
        if (reactFlowInstance) {
            setSelectedEdge(edge);
            setEdgeContextMenu({
                visible: true,
                x: event.clientX,
                y: event.clientY,
            });
        }
    }, [reactFlowInstance]);

    // 删除连接线
    const handleDeleteEdge = useCallback(() => {
        if (selectedEdge) {
            setEdges(eds => eds.filter(e => e.id !== selectedEdge.id));
            setSelectedEdge(null);
            setEdgeContextMenu({ visible: false, x: 0, y: 0 });
        }
    }, [selectedEdge, setEdges]);

    // 关闭边的上下文菜单
    const closeEdgeContextMenu = useCallback(() => {
        setEdgeContextMenu({ visible: false, x: 0, y: 0 });
        setSelectedEdge(null);
    }, []);

    // 点击其他地方关闭菜单
    const handlePaneClick = useCallback(() => {
        closeEdgeContextMenu();
    }, [closeEdgeContextMenu]);

    return (
        <NodeActionsContext.Provider value={nodeActions}>
            <div className="w-full h-screen" ref={reactFlowWrapper}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    onInit={setReactFlowInstance}
                    onContextMenu={handleContextMenu}
                    onEdgeContextMenu={handleEdgeContextMenu}
                    onPaneClick={handlePaneClick}
                    fitView
                >
                    <Controls />
                    <MiniMap />
                    <Background variant="dots" gap={12} size={1} />
                </ReactFlow>

                {/* 边的上下文菜单 */}
                {edgeContextMenu.visible && (
                    <div
                        className="fixed z-50 bg-white shadow-md rounded-md p-2"
                        style={{
                            left: edgeContextMenu.x,
                            top: edgeContextMenu.y
                        }}
                    >
                        <div
                            className="cursor-pointer hover:bg-red-100 p-2 rounded flex items-center text-red-500"
                            onClick={handleDeleteEdge}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            删除连接线
                        </div>
                    </div>
                )}

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {actionType === 'create' ? '创建新对话' :
                                    actionType === 'continue' ? '继续对话' : '创建分支对话'}
                            </DialogTitle>
                        </DialogHeader>
                        <Textarea
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="输入您的问题..."
                            className="w-full min-h-[150px] mb-4"
                            autoFocus
                        />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                取消
                            </Button>
                            <Button onClick={onSubmitDialog} type="submit">
                                发送 (Ctrl+Enter)
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                    <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>对话历史</DialogTitle>
                        </DialogHeader>
                        {selectedNode && (
                            <div className="flex flex-col space-y-4">
                                {(() => {
                                    // 获取当前节点及所有上游节点
                                    const upstreamNodes = getUpstreamNodes(selectedNode.id);

                                    // 按照ID排序（假设ID中的数字部分表示创建顺序）
                                    const sortedNodes = upstreamNodes
                                        .filter(item => item.node)
                                        .sort((a, b) => {
                                            const idA = parseInt(a.node.id.replace(/\D/g, '')) || 0;
                                            const idB = parseInt(b.node.id.replace(/\D/g, '')) || 0;
                                            return idA - idB;
                                        });

                                    return sortedNodes.map((item, index) => {
                                        const { node, connectionType } = item;
                                        // 显示连接类型标识（仅对非第一个节点显示）
                                        const connectionBadge = index > 0 ? (
                                            <div className={`text-xs px-2 py-1 rounded-full mb-1 inline-block ${
                                                connectionType === 'fork'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {connectionType === 'fork' ? '分支对话' : '继续对话'}
                                            </div>
                                        ) : null;

                                        return (
                                            <div key={node.id} className="border-b pb-4 last:border-b-0">
                                                {connectionBadge}

                                                {/* 问题部分 */}
                                                <div className="flex items-start mb-2">
                                                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                                                        <span className="text-gray-700 font-semibold">Q</span>
                                                    </div>
                                                    <div className="bg-gray-100 rounded-lg p-3 flex-grow">
                                                        <p className="text-gray-800 whitespace-pre-wrap">{node.data.question}</p>
                                                    </div>
                                                </div>

                                                {/* 回答部分 */}
                                                <div className="flex items-start pl-10">
                                                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center mr-2">
                                                        <span className="text-white font-semibold">A</span>
                                                    </div>
                                                    <div className="bg-blue-50 rounded-lg p-3 flex-grow">
                                                        {node.data.isLoading ? (
                                                            <div className="flex items-center justify-center p-4">
                                                                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                                                            </div>
                                                        ) : (
                                                            <div className="prose prose-sm max-w-none">
                                                                <ReactMarkdown>{node.data.answer}</ReactMarkdown>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}
                        <DialogFooter>
                            <Button onClick={() => setDetailDialogOpen(false)}>
                                关闭
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {process.env.NODE_ENV === 'development' && (
                    <div className="fixed bottom-2 left-2 bg-black/50 text-white p-2 rounded text-xs">
                        最后操作: {debugInfo.lastAction} | 节点ID: {debugInfo.lastNodeId}
                        <Button
                            size="sm"
                            variant="outline"
                            className="ml-2 py-0 h-6 text-xs bg-blue-500 hover:bg-blue-600"
                            onClick={debugNodes}
                        >
                            调试节点
                        </Button>
                    </div>
                )}
            </div>
        </NodeActionsContext.Provider>
    );
}
