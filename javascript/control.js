// Copyright Brandon Ly 2015 all rights reserved.

// Small library that handles the creation of meshes and its properties.

// Define a controls singleton.
var Control = {
    isMouseDown: false,
    angleX: 0.0,
    angleY: 0.0,
    lastMouseX: 0.0,
    lastMouseY: 0.0,
    currMouseX: 0.0,
    currMouseY: 0.0,
    mouseSensitivity: 10.0,

    init: function() {    
        document.addEventListener("mousedown", this.onDocumentMouseDown);
        document.addEventListener("mouseup", this.onDocumentMouseUp);
        document.addEventListener("mousemove", this.onDocumentMouseMove);
    },

    onDocumentMouseDown: function(e) {
        e = e || window.event;
        e.preventDefault();
        Control.isMouseDown = true;
        Control.currMouseX = Control.angleX;
        Control.currMouseY = Control.angleY;
        Control.lastMouseX = (e.pageX || e.clientX);
        Control.lastMouseY = (e.pageY || e.clientY);
    },

    onDocumentMouseUp: function(e) {
        e = e || window.event;
        e.preventDefault();
        Control.isMouseDown = false;
    },

    onDocumentMouseMove: function(e) {
        e = e || window.event;
        e.preventDefault();
        if (Control.isMouseDown) {
            var newMouseX = (e.pageX || e.clientX);
            var newMouseY = (e.pageY || e.clientY);
            Control.angleX = (newMouseX - Control.lastMouseX + Control.currMouseX);
            Control.angleY = (newMouseY - Control.lastMouseY + Control.currMouseY);
        }
    },

    setMouseSensitivity: function(sensitivity) {
        Control.mouseSensitivity = sensitivity;
    }
}
