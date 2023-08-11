import {
	CanvasData,
	CanvasEdgeData,
	CanvasFileData,
	CanvasGroupData,
	CanvasLinkData,
	CanvasTextData,
} from "obsidian/canvas";
import { ChatCompletionRequestMessage } from "openai";
import { CannoliObject } from "./object";
import { CannoliGroup, ForEachGroup, RepeatGroup } from "./group";
import {
	CallNode,
	ChooseNode,
	DisplayNode,
	DistributeNode,
	FormatterNode,
	InputNode,
	ReferenceNode,
} from "./node";
import { CannoliEdge, LoggingEdge, SystemMessageEdge } from "./edge";

export enum CannoliObjectKind {
	Node = "node",
	Edge = "edge",
	Group = "group",
}

export enum GroupType {
	ForEach = "for-each",
	Repeat = "repeat",
	Basic = "basic",
	While = "while",
	NonLogic = "non-logic",
}

export enum EdgeType {
	Chat = "chat",
	SystemMessage = "system-message",
	Write = "write",
	Variable = "variable",
	Key = "key",
	List = "list",
	Merge = "merge",
	Choice = "choice",
	Category = "category",
	Config = "config",
	Function = "function",
	Logging = "logging",
}

export enum CannoliObjectStatus {
	Pending = "pending",
	Executing = "executing",
	Complete = "complete",
	Rejected = "rejected",
	Error = "error",
}

export type NodeType = CallNodeType | ContentNodeType | FloatingNodeType;

export enum CallNodeType {
	StandardCall = "standard-call",
	Select = "select",
	Categorize = "categorize",
	Choose = "choose",
	Distribute = "distribute",
}

export enum ContentNodeType {
	Input = "input",
	Display = "display",
	StaticReference = "static-reference",
	DynamicReference = "dynamic-reference",
	Formatter = "formatter",
}

export enum FloatingNodeType {
	Variable = "variable",
}

export enum ReferenceType {
	Variable = "variable",
	Floating = "floating",
	Note = "note",
}

export interface Reference {
	name: string;
	type: ReferenceType;
	shouldExtract: boolean;
}

export enum VaultModifier {
	Note = "note",
	CreateNote = "create-note",
	Folder = "folder",
	CreateFolder = "create-folder",
	EditProperty = "edit-property",
	CreateProperty = "create-property",
}

export interface CannoliData {
	text: string;
	status: CannoliObjectStatus;
	dependencies: string[];
	isClone: boolean;
	kind: CannoliObjectKind;
	type: EdgeType | NodeType | GroupType;
}

export interface CannoliVertexData extends CannoliData {
	outgoingEdges: string[];
	incomingEdges: string[];
	groups: string[];
}

export interface CannoliEdgeData extends CannoliData {
	crossingInGroups: string[];
	crossingOutGroups: string[];
	addMessages: boolean;
	isReflexive: boolean;
	content?: string | Record<string, string>;
	messages?: ChatCompletionRequestMessage[];
	name?: string;
	vaultModifier?: VaultModifier;
}

export interface CannoliGroupData extends CannoliVertexData {
	members: string[];
	maxLoops?: number;
	currentLoop?: number;
}

export interface CannoliNodeData extends CannoliVertexData {
	references?: Reference[];
}

export interface CannoliCanvasFileData extends CanvasFileData {
	cannoliData?: CannoliNodeData;
}

export interface CannoliCanvasTextData extends CanvasTextData {
	cannoliData?: CannoliNodeData;
}

export interface CannoliCanvasLinkData extends CanvasLinkData {
	cannoliData?: CannoliNodeData;
}

export interface CannoliCanvasGroupData extends CanvasGroupData {
	cannoliData?: CannoliGroupData;
}

export interface CannoliCanvasEdgeData extends CanvasEdgeData {
	cannoliData?: CannoliEdgeData;
}

export interface VerifiedCannoliCanvasFileData extends CanvasFileData {
	cannoliData: CannoliNodeData;
}

export interface VerifiedCannoliCanvasTextData extends CanvasTextData {
	cannoliData: CannoliNodeData;
}

export interface VerifiedCannoliCanvasLinkData extends CanvasLinkData {
	cannoliData: CannoliNodeData;
}

export interface VerifiedCannoliCanvasGroupData extends CanvasGroupData {
	cannoliData: CannoliGroupData;
}

export interface VerifiedCannoliCanvasEdgeData extends CanvasEdgeData {
	cannoliData: CannoliEdgeData;
}

export type AllCannoliCanvasNodeData =
	| CannoliCanvasFileData
	| CannoliCanvasTextData
	| CannoliCanvasLinkData
	| CannoliCanvasGroupData;

export type AllVerifiedCannoliCanvasNodeData =
	| VerifiedCannoliCanvasFileData
	| VerifiedCannoliCanvasTextData
	| VerifiedCannoliCanvasLinkData
	| VerifiedCannoliCanvasGroupData;

export interface CannoliCanvasData extends CanvasData {
	nodes: AllCannoliCanvasNodeData[];
	edges: CannoliCanvasEdgeData[];
}

export interface VerifiedCannoliCanvasData extends CanvasData {
	nodes: AllVerifiedCannoliCanvasNodeData[];
	edges: VerifiedCannoliCanvasEdgeData[];
}

export class CannoliGraph {
	cannoliCanvasData: VerifiedCannoliCanvasData;
	graph: Record<string, CannoliObject> = {};

	constructor(cannoliCanvasData: VerifiedCannoliCanvasData) {
		this.cannoliCanvasData = cannoliCanvasData;

		this.hydrateGraph();
	}

	hydrateGraph() {
		for (const node of this.cannoliCanvasData.nodes) {
			switch (node.cannoliData?.type) {
				case GroupType.ForEach: {
					const forEachGroup = node as VerifiedCannoliCanvasGroupData;
					this.graph[node.id] = new ForEachGroup(forEachGroup);
					break;
				}
				case GroupType.Repeat: {
					const repeatGroup = node as VerifiedCannoliCanvasGroupData;
					this.graph[node.id] = new RepeatGroup(repeatGroup);
					break;
				}
				case GroupType.Basic: {
					const basicGroup = node as VerifiedCannoliCanvasGroupData;
					this.graph[node.id] = new CannoliGroup(basicGroup);
					break;
				}
				case ContentNodeType.Input: {
					const inputNode = node as VerifiedCannoliCanvasTextData;
					this.graph[node.id] = new InputNode(inputNode);
					break;
				}
				case ContentNodeType.Display: {
					const displayNode = node as VerifiedCannoliCanvasTextData;
					this.graph[node.id] = new DisplayNode(displayNode);
					break;
				}
				case ContentNodeType.StaticReference: {
					const staticReferenceNode =
						node as VerifiedCannoliCanvasTextData;
					this.graph[node.id] = new ReferenceNode(
						staticReferenceNode
					);
					break;
				}
				case ContentNodeType.DynamicReference: {
					console.error("Dynamic references not yet implemented");
					// const dynamicReferenceNode =
					// 	node as VerifiedCannoliCanvasTextData;
					// this.graph[node.id] = new ReferenceNode(
					// 	dynamicReferenceNode
					// );
					break;
				}
				case ContentNodeType.Formatter: {
					const formatterNode = node as VerifiedCannoliCanvasTextData;
					this.graph[node.id] = new FormatterNode(formatterNode);
					break;
				}
				case CallNodeType.StandardCall: {
					const standardCallNode =
						node as VerifiedCannoliCanvasTextData;
					this.graph[node.id] = new CallNode(standardCallNode);
					break;
				}
				case CallNodeType.Choose: {
					const chooseNode = node as VerifiedCannoliCanvasTextData;
					this.graph[node.id] = new ChooseNode(chooseNode);
					break;
				}
				case CallNodeType.Distribute: {
					const distributeNode =
						node as VerifiedCannoliCanvasTextData;
					this.graph[node.id] = new DistributeNode(distributeNode);
					break;
				}
				case CallNodeType.Categorize: {
					console.error("Categorize node not implemented");
					// const categorizeNode =
					// 	node as VerifiedCannoliCanvasTextData;
					// this.graph[node.id] = new CategorizeNode(categorizeNode);
					break;
				}
				case CallNodeType.Select: {
					console.error("Select node not implemented");
					// const selectNode = node as VerifiedCannoliCanvasTextData;
					// this.graph[node.id] = new SelectNode(selectNode);
					break;
				}

				default: {
					throw new Error(
						`Unknown node type: ${node.cannoliData?.type}`
					);
				}
			}
		}

		for (const edge of this.cannoliCanvasData.edges) {
			switch (edge.cannoliData?.type) {
				case EdgeType.Logging: {
					const loggingEdge = edge as VerifiedCannoliCanvasEdgeData;
					this.graph[edge.id] = new LoggingEdge(loggingEdge);
					break;
				}
				case EdgeType.SystemMessage: {
					const systemMessageEdge =
						edge as VerifiedCannoliCanvasEdgeData;
					this.graph[edge.id] = new SystemMessageEdge(
						systemMessageEdge
					);
					break;
				}

				default: {
					const genericEdge = edge as VerifiedCannoliCanvasEdgeData;
					this.graph[edge.id] = new CannoliEdge(genericEdge);
					break;
				}
			}
		}

		// Call setGraph with the graph on every object
		for (const id in this.graph) {
			this.graph[id].setGraph(this.graph);
		}
	}

	// getEdge(id: string): CannoliEdge {
	// 	// Use type guard to ensure that the edge is actually an edge
	// 	if (this.isEdge(this.graph[id])) {
	// 		return this.graph[id];
	// 	} else {
	// }

	// isEdge(edge: CannoliObject): edge is CannoliEdge {
	// 	return edge.kind === CannoliObjectKind.Edge;
	// }
}