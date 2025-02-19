# canvas_tab
ComfyUI canvas editor page

## Updates 

 - 2023-11-30 Added  "Replace Targeted Layer" as an input mode,  right click on a layer to set it as target to be replaced


This plugin provides two nodes to provide a full page editor that runs in another tab.

There is an input node `Edit in another Tab ` and an output node `Send to Editor Tab`.
Both are stored in the images submenu.

## Installation
The recommended way to install is via comfy manager.  This will automatically handle the web directory.

### Manual installation
You can manually install by cloning this repo into the custom_nodes directory and either creating a symlink or copying the files in the web sub directory into web/extensions/canvas_tab.

using a symlink from web/extensions/canvas_tab ==> custom_nodes/canvas_tab/web should avoid having to re-copy files when you update.

## User Interface
You can edit multiple images at once.  
Drag images around with the middle mouse button and scale them with the mouse wheel.

There is a green Tab on the side of images in the editor,  click on that tab to highlight it. 
The image with the highlighted tab is sent through to the comfyUI node. 

You can have multiple image layers and you can select generated images to be 
added as a new layer, replace an existing layers, or as a new image.  

You can delete layers by clicking on the layer widget with Ctrl-LeftClick. The layer must be visible for this to work as a protection against unwittingly deleting something important.

Ctrl-click on palette entries reassigns the palette color tho the current color.
Middle-click on palette entries sets the palette color to the current foreground color.

Both nodes provided by this extension support receiving files by drag and drop to 
send images directly to the editor.

## Hotkeys

 - B for Brush tool
 - E for Erase tool
 - Z for pixel editing tool
 - P for color Picker
 - BackSpace to clear a layer
 - ALT_BackSpace to fill the layer with the foreground color
 - CTRL_Backspace to fill the layer with the background color
 - CTRL_Z undo
 - CTRL_SHIFT_Z redo


##Why would you do such a thing?

My main motivation for making this was to develop an inpainting workflow, 
but I have also found it quite useful for scribble based images, 

This image shows a basic workflow where it simply sends the image back to itself and shows
previews of the image and mask.   The workflow is also embedded in this image.

![basic usage ](https://raw.githubusercontent.com/Lerc/canvas_tab/main/Canvas_tab_basic.png)

I have been using the controlnet inpaint with a workflow like this.  

![inpaint workflow](https://raw.githubusercontent.com/Lerc/canvas_tab/main/Inpaint_with_canvas_tab.png)

That workflow should be embedded in this image.

![Image with embedded Inpaint workflow](https://raw.githubusercontent.com/Lerc/canvas_tab/main/Inpaint_Onion.png)




