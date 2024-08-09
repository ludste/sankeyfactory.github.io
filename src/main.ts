import panzoom from "panzoom";
import { SankeyNode } from "./Sankey/SankeyNode";
import { Point } from "./Point";
import { MouseHandler } from "./MouseHandler";

async function main()
{
    let viewport: SVGElement | null = document.querySelector("#viewport");
    let nodesGroup = document.querySelector("g.nodes") as SVGGElement;
    let linksGroup = document.querySelector("g.links") as SVGGElement;

    if (viewport == null || nodesGroup == null || linksGroup == null)
    {
        throw new Error("Svg container is broken");
    }

    let isHoldingAlt = false;

    let panContext = panzoom(viewport, {
        zoomDoubleClickSpeed: 1, // disables double click zoom
        beforeMouseDown: () =>
        {
            return !isHoldingAlt;
        }
    });

    MouseHandler.getInstance().setPanContext(panContext);

    window.addEventListener("keydown", (event) =>
    {
        if (event.repeat) { return; }

        if (event.key == "Alt")
        {
            isHoldingAlt = true;
            document.querySelector("#container")!.classList.add("move");
        }

        if (event.key == "Escape")
        {
            MouseHandler.getInstance().cancelConnectingSlots();
        }
    });

    window.addEventListener("keyup", (event) =>
    {
        if (event.repeat) { return; }

        if (event.key == "Alt")
        {
            isHoldingAlt = false;
            document.querySelector("#container")!.classList.remove("move");
        }
    });

    window.addEventListener("keypress", (event) =>
    {
        if (event.code === "KeyN")
        {
            const node = new SankeyNode(nodesGroup, new Point(50, 50), [50, 50], [100]);

            node.nodeSvg.onmousedown = (event) =>
            {
                if (!isHoldingAlt && event.buttons === 1)
                {
                    MouseHandler.getInstance().startDraggingNode(event, node);
                }
            };
        }
    });

    window.onmouseup = () =>
    {
        MouseHandler.getInstance().handleMouseUp();
    };

    window.onmousemove = (event) =>
    {
        MouseHandler.getInstance().handleMouseMove(event);
    };
}

main().catch((reason) =>
{
    console.error(reason);
});
