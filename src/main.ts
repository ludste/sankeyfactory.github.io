import panzoom from "panzoom";
import { SankeyNode } from "./Sankey/SankeyNode";
import { Point } from "./Point";
import { MouseHandler } from "./MouseHandler";

// Ignore import error as the file only appears on launch of the exporting tool.
// @ts-ignore
import satisfactoryData from '../dist/GameData/Satisfactory.json';
import { GameRecipe, GameRecipeEvent } from "./GameData/GameRecipe";

async function main()
{
    let viewport: SVGElement | null = document.querySelector("#viewport");
    let nodesGroup = document.querySelector("g.nodes") as SVGGElement;
    let linksGroup = document.querySelector("g.links") as SVGGElement;
    let zoomRatioDisplay = document.querySelector("p#ratio-display") as HTMLParagraphElement;

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

    panContext.on('zoom', () =>
    {
        let zoomScale = panContext.getTransform()?.scale ?? 1.0;
        zoomRatioDisplay.textContent = `Zoom: ${zoomScale.toPrecision(2)}x`;
    });

    function createNode()
    {
        const node = new SankeyNode(nodesGroup, new Point(50, 50), [50, 50], [100]);

        node.nodeSvg.onmousedown = (event) =>
        {
            if (!isHoldingAlt && event.buttons === 1)
            {
                MouseHandler.getInstance().startDraggingNode(event, node);
            }
        };
    };

    (document.querySelector("div.button#create-node") as HTMLDivElement).onclick = () =>
    {
        let nodeCreationContainer = document.querySelector("div#node-creation-container");
        nodeCreationContainer?.classList.remove("hidden");
    };

    let isLocked: boolean = false;
    let lockButton = document.querySelector("div.button#lock-viewport") as HTMLDivElement;
    let unlockedIcon = document.querySelector("div.button#lock-viewport>svg.unlocked") as SVGElement;
    let lockedIcon = document.querySelector("div.button#lock-viewport>svg.locked") as SVGElement;

    lockButton.onclick = () =>
    {
        if (isLocked)
        {
            panContext.resume();
            isLocked = false;

            unlockedIcon.classList.remove("hidden");
            lockedIcon.classList.add("hidden");
        }
        else
        {
            panContext.pause();
            isLocked = true;

            unlockedIcon.classList.add("hidden");
            lockedIcon.classList.remove("hidden");
        }
    };

    MouseHandler.getInstance().setPanContext(panContext);

    window.addEventListener("keydown", (event) =>
    {
        if (event.repeat) { return; }

        if (event.key === "Alt")
        {
            isHoldingAlt = true;
            document.querySelector("#container")!.classList.add("move");
        }

        if (event.key === "Escape")
        {
            MouseHandler.getInstance().cancelConnectingSlots();
        }
    });

    window.addEventListener("keyup", (event) =>
    {
        if (event.repeat) { return; }

        if (event.key === "Alt")
        {
            isHoldingAlt = false;
            document.querySelector("#container")!.classList.remove("move");
        }
    });

    let nodeCreationContainer = document.querySelector("div#node-creation-container");

    window.addEventListener("keypress", (event) =>
    {
        if (event.code === "KeyN")
        {
            let nodeCreationContainer = document.querySelector("div#node-creation-container");
            nodeCreationContainer?.classList.remove("hidden");
        }
    });

    window.addEventListener("keydown", (event) =>
    {
        if (event.code === "Escape" && !nodeCreationContainer?.classList.contains("hidden"))
        {
            nodeCreationContainer?.classList.add("hidden");
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

    let nodeCreationClose = document.querySelector("div#node-creation-close");
    nodeCreationClose?.addEventListener("click", () =>
    {
        nodeCreationContainer?.classList.add("hidden");
    });

    nodeCreationContainer!.addEventListener("click", () =>
    {
        document.dispatchEvent(new GameRecipeEvent(undefined, undefined, "recipe-selected"));
    });

    let tabSelectors = document.querySelector("div#tab-selectors")!;
    let recipeTabs = document.querySelector("div#recipe-tabs")!;

    for (const machine of satisfactoryData.machines)
    {
        let tabSelector = document.createElement("div");
        tabSelector.classList.add("tab-selector");

        let machineIcon = document.createElement("img");
        machineIcon.classList.add("machine-icon");

        machineIcon.src = `GameData/SatisfactoryIcons/${machine.iconPath}`;
        machineIcon.alt = machine.displayName;
        machineIcon.loading = "lazy";

        let recipesTab = document.createElement("div");
        recipesTab.classList.add("recipes-tab");

        let createRecipesGroup = (name: string): { div: HTMLDivElement, title: HTMLHeadingElement; } =>
        {
            let groupTitle = document.createElement("h3");
            groupTitle.classList.add("group-title");
            groupTitle.innerText = name;

            let groupDiv = document.createElement("div");
            groupDiv.classList.add("group");

            return { div: groupDiv, title: groupTitle };
        };

        let basicRecipesGroup = createRecipesGroup("Basic recipes");
        let alternateRecipesGroup = createRecipesGroup("Alternate recipes");
        let eventsRecipesGroup = createRecipesGroup("Events recipes");

        let createRecipeParser = (simpleRecipesGroup: HTMLDivElement) =>
        {
            return (recipe: typeof machine.recipes[0]): void =>
            {
                let recipeNode = document.createElement("div");
                recipeNode.classList.add("recipe");

                for (const product of recipe.products)
                {
                    let itemIcon = document.createElement("img");
                    itemIcon.classList.add("item-icon");

                    let isEventRecipe = false;

                    let resource = satisfactoryData.resources.find(
                        // I specify type because deploy fails otherwise for some reason.
                        (resource: typeof satisfactoryData.resources[0]) => 
                        {
                            return resource.id == product.id;
                        }
                    );

                    if (resource != undefined)
                    {
                        itemIcon.src = `GameData/SatisfactoryIcons/${resource.iconPath}`;
                        isEventRecipe = resource.iconPath.startsWith("Events");
                    }

                    itemIcon.alt = recipe.displayName;
                    itemIcon.loading = "lazy";

                    recipeNode.appendChild(itemIcon);

                    recipeNode.addEventListener("click", (event) =>
                    {
                        document.dispatchEvent(new GameRecipeEvent(recipe, machine, "recipe-selected"));
                        recipeNode.classList.add("selected");
                        event.stopPropagation();
                    });

                    document.addEventListener("recipe-selected", () =>
                    {
                        recipeNode.classList.remove("selected");
                    });

                    if (isEventRecipe)
                    {
                        eventsRecipesGroup.div.appendChild(recipeNode);
                    }
                    else
                    {
                        simpleRecipesGroup.appendChild(recipeNode);
                    }
                }
            };
        };

        machine.recipes.forEach(createRecipeParser(basicRecipesGroup.div));
        machine.alternateRecipes.forEach(createRecipeParser(alternateRecipesGroup.div));

        if (basicRecipesGroup.div.childElementCount !== 0)
        {
            recipesTab.appendChild(basicRecipesGroup.title);
            recipesTab.appendChild(basicRecipesGroup.div);
        }
        if (alternateRecipesGroup.div.childElementCount !== 0)
        {
            recipesTab.appendChild(alternateRecipesGroup.title);
            recipesTab.appendChild(alternateRecipesGroup.div);
        }
        if (eventsRecipesGroup.div.childElementCount !== 0)
        {
            recipesTab.appendChild(eventsRecipesGroup.title);
            recipesTab.appendChild(eventsRecipesGroup.div);
        }

        tabSelector.addEventListener("click", () =>
        {
            document.dispatchEvent(new Event("recipes-tab-switched"));
            recipesTab.classList.add("active");
            tabSelector.classList.add("active");
        });

        document.addEventListener("recipes-tab-switched", () =>
        {
            recipesTab.classList.remove("active");
            tabSelector.classList.remove("active");
        });

        tabSelector.appendChild(machineIcon);
        tabSelectors?.appendChild(tabSelector);

        recipeTabs.appendChild(recipesTab);
    }

    let selectedRecipeDisplay = document.querySelector("div#selected-recipe") as HTMLDivElement;

    selectedRecipeDisplay.scrollTop = selectedRecipeDisplay.scrollHeight;

    let createResourceDisplay = (parentDiv: HTMLDivElement, craftingTime: number) =>
    {
        return (recipeResource: RecipeResource) =>
        {
            let resource = satisfactoryData.resources.find(
                (el: typeof satisfactoryData.resources[0]) =>
                {
                    return el.id === recipeResource.id;
                }
            );

            let resourceDiv = document.createElement("div");
            resourceDiv.classList.add("resource");

            let icon = document.createElement("img");
            icon.classList.add("icon");
            icon.loading = "lazy";
            icon.alt = resource!.displayName;
            icon.src = `GameData/SatisfactoryIcons/${resource!.iconPath}`;

            let amount = document.createElement("p");
            amount.classList.add("amount");
            amount.innerText = `${+((60 / craftingTime) * recipeResource.amount).toPrecision(3)}`;

            resourceDiv.appendChild(icon);
            resourceDiv.appendChild(amount);
            parentDiv.appendChild(resourceDiv);
        };
    };

    document.addEventListener("recipe-selected", (event) =>
    {
        let recipe = (event as GameRecipeEvent).recipe;
        let machine = (event as GameRecipeEvent).machine;

        if (recipe == undefined || machine == undefined)
        {
            selectedRecipeDisplay.classList.add("hidden");
        }
        else
        {
            let selectedRecipeName = document.querySelector("#selected-recipe-name>div.text") as HTMLDivElement;
            selectedRecipeName.innerText = recipe.displayName;

            let selectedRecipeMachine = document.querySelector("#selected-recipe-machine>div.machine>img.icon") as HTMLImageElement;
            selectedRecipeMachine.src = `GameData/SatisfactoryIcons/${machine.iconPath}`;

            document.querySelectorAll("#selected-recipe-input>div.resource").forEach(div => div.remove());
            let selectedRecipeInput = document.querySelector("#selected-recipe-input") as HTMLDivElement;

            recipe.ingredients.forEach(createResourceDisplay(selectedRecipeInput, recipe.manufacturingDuration));

            document.querySelectorAll("#selected-recipe-output>div.resource").forEach(div => div.remove());
            let selectedRecipeOutput = document.querySelector("#selected-recipe-output") as HTMLDivElement;

            recipe.products.forEach(createResourceDisplay(selectedRecipeOutput, recipe.manufacturingDuration));

            let selectedRecipePower = document.querySelector("#selected-recipe-power>div.text") as HTMLDivElement;
            selectedRecipePower.innerText = `${machine.powerConsumption} MW`;

            selectedRecipeDisplay.classList.remove("hidden");

            selectedRecipeDisplay.scrollTop = selectedRecipeDisplay.scrollHeight;
        }
    });

    let confirmRecipeButton = document.querySelector("div#confirm-recipe")!;

    confirmRecipeButton.addEventListener("click", () =>
    {
        nodeCreationContainer?.classList.add("hidden");
        createNode();
    });

    tabSelectors.children[0].classList.add("active");
    recipeTabs.children[0].classList.add("active");
}

main().catch((reason) =>
{
    console.error(reason);
});
