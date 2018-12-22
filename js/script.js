var width = document.body.clientWidth
var height = document.body.clientHeight

var s = Snap("#snap");
s.node.setAttribute("width", width)
s.node.setAttribute("height", height)

function deg2rad(deg) {
    return deg * Math.PI / 180
}

const minH = 0.15
const maxH = 0.35
const hGrowth = 1.2

const minS = 0.4
const maxS = 0.75
const sGrowth = 1.1

const maxL = 0.4
const minL = 0.2
const lGrowth = 0.95

const maxClicks = 7
var numClicks = 0
var canClick = null
enableClick()

function noise(scalar) {
    var n = scalar || 1
    return Math.sin((Math.random() - 0.5) * Math.PI) / n
}

function enableClick() {
    if (numClicks > maxClicks) {
        return
    }
    canClick = true
    document.body.classList.add("clickable")
}

function disableClick() {
    canClick = false
    document.body.classList.remove("clickable")
}

class FernShade {
    constructor(h, s, l) {
        this.h = h || minH;
        this.s = s || minS
        this.l = l || maxL
    }

    step() {
        var newH = Math.min(this.h * hGrowth, maxH) + noise(18)
        var newS = Math.min(this.s * sGrowth, maxS) + noise(8)
        var newL = Math.max(this.l * lGrowth, minL) + noise(2)
        return new FernShade(newH, this.s, this.l)
    }

    toString() {
        return "hsl(" + (this.h * 100) + "%, " + (this.s * 100) + "%, " + (this.l * 100) + "%)"
    }
}

function fernLineFromFeatures(features) {
    return new FernLine(
        features.lastX,
        features.lastY,
        features.lastTheta,
        features.stroke.step(),
        Math.max(features.thickness * 0.8, 1))
}

class FernLine {
    constructor(x, y, theta, stroke, thickness) {
        this.lastX = x !== undefined ? x : (width / 2)
        this.lastY = y !== undefined ? y : (height / 2)
        this.lastTheta = theta !== undefined ? theta : -90
        this.stroke = stroke || new FernShade()
        this.thickness = thickness || 5

        // we use absolute paths so that we can branch easier
        this.pathString = "M" + this.lastX + "," + this.lastY

        this.pathObject = s.path(this.pathString)
        this.pathObject.attr({
            stroke: this.stroke.toString(),
            strokeWidth: this.thickness,
            fill: "none"
        })
        this.pathObject.node.style.tranformOrigin = this.lastX + "px," + this.lastY + "px"
        
    }

    oldFeatures(dTheta) {
        dTheta = dTheta || 0
        return {
            lastTheta: this.lastTheta + dTheta,
            lastX: this.lastX,
            lastY: this.lastY,
            stroke: this.stroke,
            thickness: this.thickness
        }
    }

    move(magnitude, relativeTheta) {
        var oldValues = this.oldFeatures()

        this.lastTheta += (relativeTheta || 0)

        var rad = deg2rad(this.lastTheta)

        this.lastX += Math.cos(rad) * magnitude
        this.lastY += Math.sin(rad) * magnitude
        this.pathString += "L" + this.lastX + "," + this.lastY
        this.pathObject.attr("path", this.pathString)

        this.pathObject.node.classList.add("grow")

        return oldValues
    }

    moveCursor(oldValueObject) {
        this.lastX = oldValueObject.lastX
        this.lastY = oldValueObject.lastY
        this.lastTheta = oldValueObject.lastTheta
        this.pathString += "M" + this.lastX + "," + this.lastY
        this.pathObject.attr("path", this.pathString)
    }
}

class Fractal {
    constructor(x, y, dTheta, magnitude) {
        // this.nodes = [new FernLine(x, y)]
        this.dTheta = dTheta || 25
        this.magnitude = magnitude || (Math.min(width, height) / 8)
        var fakeFern = new FernLine(x, y)
        fakeFern.pathObject.remove()

        // structure it in "waves" so that way we're not adding useless SVG "stubs" that
        // add nodes to the dom
        this.nextNodes = [fakeFern.oldFeatures()]
        this.nodes = []
    }

    // following pseudocode here: https://en.wikipedia.org/wiki/L-system#Example_7:_Fractal_plant
    iterate() {
        disableClick()

        this.nodes = this.nextNodes.map(node => {
            return fernLineFromFeatures(node)
        })

        var nextNodes = []
        var magnitude = this.magnitude
        var dTheta = this.dTheta

        this.nodes.forEach(node => {
            node.move(magnitude)
            node.dTheta += dTheta
            nextNodes.push(node.oldFeatures(noise(10)))
            nextNodes.push(node.oldFeatures(-1 * dTheta + noise(0.75)))
            node.move(magnitude / 2, -1 * dTheta)
            var oldValues = node.move(magnitude / 4, -1 * dTheta)
            nextNodes.push(node.oldFeatures(noise(10)))      
            node.moveCursor(oldValues)
            node.dTheta += dTheta
            nextNodes.push(node.oldFeatures(2 * dTheta + noise(0.75)))
        })

        this.magnitude *= 0.75

        setTimeout(enableClick, 1.5 * 1000)

        // only add the animation after everything has been added, so it looks more seamless
        this.nextNodes = nextNodes
    }
}

var fractal = new Fractal(width / 2, height)

document.body.onclick = () => {
    if (!canClick) {
        return
    }
    fractal.iterate()
    numClicks++
    if (numClicks > maxClicks) {
        disableClick()
    }

}