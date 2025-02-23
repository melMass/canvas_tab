import { app } from '/scripts/app.js'
import { api } from '/scripts/api.js'

let myticker = 0
let dummyBlob
let editor = {} // one image editor for all nodes, otherwise communication is messy when reload happens
// for now that means only one editor node is practical.
// adding a protocol that identifies multiple nodes would allow the one editor
// to serve multiple nodes.

const plugin_name = 'canvas_link'
const editor_path = '/extensions/canvas_tab/page/index.html'

function setSignal(key) {
  const keyName = plugin_name + ':' + key
  localStorage.setItem(keyName, 'true')
}

function clearSignal(key) {
  const keyName = plugin_name + ':' + key
  localStorage.removeItem(keyName)
}

function getSignal(key) {
  const keyName = plugin_name + ':' + key
  return localStorage.getItem(keyName) === 'true'
}

function checkAndClear(key) {
  const keyName = plugin_name + ':' + key
  let result = localStorage.getItem(keyName) === 'true'
  if (result) localStorage.removeItem(keyName)
  return result
}

const initEditorNode = (node) => {
  node.collected_images = []
  node.addWidget(
    'button',
    'Edit',
    'bingo',
    (widget, graphCanvas, node, { x, y }, event) => focusEditor(node)
  )
  node.widgets.reverse() // because auto created widget get put in first

  node.canvasWidget = node.widgets[1]
  node.maskWidget = node.widgets[2]

  node.maskWidget.onTopOf = node.canvasWidget
  editor.channel?.port1?.postMessage?.({ retransmit: true })
  return
}

function addDragDropSupport(node) {
  // Add handler to check if an image is being dragged over our node
  node.onDragOver = function (e) {
    if (e.dataTransfer && e.dataTransfer.items) {
      const image = [...e.dataTransfer.items].find((f) => f.kind === 'file')
      return !!image
    }
    return false
  }

  // On drop upload files
  node.onDragDrop = function (e) {
    let handled = false
    for (const file of e.dataTransfer.files) {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        transmitImages([url])
        setTimeout((_) => URL.revokeObjectURL(url), 1000)
        handled = true
      }
    }
    return handled
  }
}
function transmitImages(images) {
  console.debug('transmit', editor)
  if (!editor.window || editor.window.closed) openEditor()

  if (editor.channel) {
    editor.channel.port1.postMessage({ images })
  } else {
    //try again after half a second just in case we caught it setting up.
    setTimeout((_) => {
      editor?.channel?.port1.postMessage({ images })
    }, 500)
  }
}

function initTransmitNode(node) {
  node.collected_images = []

  node.onExecuted = (output) => {
    if (output?.collected_images) {
      transmitImages(output.collected_images)
    }
  }

  return
}

function openEditor() {
  editor = {} //  start over with new editor;
  if (getSignal('clientPage')) {
    //if clientPage is set, there might be a new page to replace the lost one
    setSignal('findImageEditor')
    setTimeout((_) => {
      if (checkAndClear('findImageEditor')) {
        //if the flag is still set by here, assume there's no-one out there
        console.debug('open window a')
        editor.window = window.open(editor_path, plugin_name)
      }
    }, 1000)
  } else {
    console.debug('open window b')
    editor.window = window.open(editor_path, plugin_name)
  }
}

function focusEditor() {
  if (!editor.window || editor.window.closed) {
    openEditor()
  } else {
    editor.window.focus()
  }
}

async function uploadBlob(blob, filename = 'blob') {
  try {
    // Wrap file in formdata so it includes filename
    const body = new FormData()
    body.append('image', blob, filename)
    const resp = await api.fetchApi('/upload/image', {
      method: 'POST',
      body,
    })

    if (resp.status === 200) {
      return await resp.json()
    } else {
      alert(resp.status + ' - ' + resp.statusText)
    }
  } catch (error) {
    alert(error)
  }
}

function addCanvasWidget(node, name, inputData, app) {
  const widget = {
    type: inputData[0],
    name,
    size: [128, 128],
    image: null,
    sendBlobRequired: true,
    uploadedBlobName: '',
    _blob: null,
    background: '#8888',
    _value: '',
    get value() {
      return this._value
    },
    set value(newValue) {
      this._value = newValue
    },
    get blob() {
      return this._blob
    },
    set blob(newValue) {
      this._blob = newValue
      this.sendBlobRequired = true
    },
    draw(ctx, node, width, y) {
      let [nodeWidth, nodeHeight] = node.size
      if (this.onTopOf) {
        ctx.globalAlpha = 0.5
        y = this.onTopOf.last_y
      } else {
        ctx.globalAlpha = 1
        ctx.fillStyle = this.background
        ctx.fillRect(0, y, width, nodeHeight - y)
      }
      if (this.image) {
        const imageAspect = this.image.width / this.image.height
        let height = nodeHeight - y
        const widgetAspect = width / height
        let targetWidth, targetHeight
        if (imageAspect > widgetAspect) {
          targetWidth = width
          targetHeight = width / imageAspect
        } else {
          targetHeight = height
          targetWidth = height * imageAspect
        }
        ctx.drawImage(
          this.image,
          (width - targetWidth) / 2,
          y + (height - targetHeight) / 2,
          targetWidth,
          targetHeight
        )
      }
    },
    computeSize(...args) {
      return [128, 128]
    },
    async serializeValue(nodeId, widgetIndex) {
      let widget = node.widgets[widgetIndex]
      let blob = widget.blob
      if (!(blob instanceof Blob)) blob = dummyBlob
      if (widget.sendBlobRequired) {
        let result = await uploadBlob(blob, widget.name + '_Image.png')
        if (result) {
          widget.uploadedBlobName = result.name
          widget.sendBlobRequired = false
        }
      }
      return widget.uploadedBlobName
    },
  }
  node.addCustomWidget(widget)

  return widget
}

function initiateCommunication() {
  if (editor.window && !editor.window.closed) {
    editor.channel = new MessageChannel()
    editor.window.postMessage('Initiate communication', '*', [
      editor.channel.port2,
    ])
    editor.channel.port1.onmessage = messageFromEditor
  }
}

function loadBlobIntoWidget(widget, blob) {
  const objectURL = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    widget.blob = blob
    widget.image = img
    app.graph.setDirtyCanvas(true)
    URL.revokeObjectURL(objectURL)
  }
  img.src = objectURL
}

function handleWindowMessage(e) {
  if (typeof e.data === 'object' && e.data?.category === plugin_name) {
    let data = e.data.data
    if (data == 'Editor Here') {
      editor.window = e.source
      initiateCommunication()
    } else console.debug('window message received', e)
  }
}

function messageFromEditor(event) {
  const nodes = app.graph.findNodesByType('Canvas_Tab')
  //send same thing to all of the Canvas_Tab nodes
  if (event.data.image instanceof Blob) {
    for (const node of nodes) {
      loadBlobIntoWidget(node.canvasWidget, event.data.image)
    }
  }
  if (event.data.mask instanceof Blob) {
    for (const node of nodes) {
      loadBlobIntoWidget(node.maskWidget, event.data.mask)
    }
  } else {
    console.debug('Message received from Image Editor:', event.data)
  }
}

function checkForExistingEditor() {
  if (getSignal('clientPage')) {
    setSignal('findImageEditor')
    // Signal the Image Editor page to identify itself for reattachment
  }
}

app.registerExtension({
  name: 'canvas_tab',
  async init() {
    console.debug('init:' + this.name)
    checkForExistingEditor()
    const blankImage = document.createElement('canvas')
    blankImage.width = 64
    blankImage.height = 64
    blankImage.toBlob((a) => (dummyBlob = a))

    addEventListener('message', handleWindowMessage)
  },

  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    switch (nodeData.name) {
      case 'Canvas_Tab': {
        const onNodeCreated = nodeType.prototype.onNodeCreated
        nodeType.prototype.onNodeCreated = function () {
          const r = onNodeCreated
            ? onNodeCreated.apply(this, arguments)
            : undefined

          console.debug('Initilizing canvas tab node', this)
          initEditorNode(this)
          console.debug('Initilizing drag and drop support')
          addDragDropSupport(this)
        }
        break
      }
      case 'Send_To_Editor': {
        const onNodeCreated = nodeType.prototype.onNodeCreated
        nodeType.prototype.onNodeCreated = function () {
          const r = onNodeCreated
            ? onNodeCreated.apply(this, arguments)
            : undefined

          initTransmitNode(node)
          addDragDropSupport(node)
          return r
        }

        break
      }
      default:
        break
    }
  },

  getCustomWidgets: function () {
    return {
      CANVAS: (node, inputName, inputData, app) => {
        return addCanvasWidget(node, inputName, inputData, app)
      },
    }
  },
})
