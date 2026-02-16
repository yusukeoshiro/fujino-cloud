import { Popover as PopoverPrimitive } from "bits-ui";
import Content from "./popover-content.svelte";

const Root = PopoverPrimitive.Root;
const Trigger = PopoverPrimitive.Trigger;
const Portal = PopoverPrimitive.Portal;
const Close = PopoverPrimitive.Close;
const Arrow = PopoverPrimitive.Arrow;
const Overlay = PopoverPrimitive.Overlay;

export {
	Root,
	Content,
	Trigger,
	Portal,
	Close,
	Arrow,
	Overlay,
	//
	Root as Popover,
	Content as PopoverContent,
	Trigger as PopoverTrigger,
	Portal as PopoverPortal,
	Close as PopoverClose,
	Arrow as PopoverArrow,
	Overlay as PopoverOverlay,
};
