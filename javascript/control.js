// Copyright Brandon Ly 2015 all rights reserved.

// Small library that handles the creation of meshes and its properties.

// Define a controls namespace.
var Control = Control || {};

Control.var = {
    isMouseDown: false,
    angleX: 0.0,
    angleY: 0.0,
    lastMouseX: 0.0,
    lastMouseY: 0.0,
    currMouseX: 0.0,
    currMouseY: 0.0,
    mouseSensitivity: 10.0
}

Control.init = function() {    
    document.addEventListener("mousedown", this.onDocumentMouseDown);
    document.addEventListener("mouseup", this.onDocumentMouseUp);
    document.addEventListener("mousemove", this.onDocumentMouseMove);
};

Control.onDocumentMouseDown = function(e) {
    e = e || window.event;
    e.preventDefault();
    Control.var.isMouseDown = true;
    Control.var.currMouseX = Control.var.angleX;
    Control.var.currMouseY = Control.var.angleY;
    Control.var.lastMouseX = (e.pageX || e.clientX);
    Control.var.lastMouseY = (e.pageY || e.clientY);
};

Control.onDocumentMouseUp = function(e) {
    e = e || window.event;
    e.preventDefault();
    Control.var.isMouseDown = false;
};

Control.onDocumentMouseMove = function(e) {
    e = e || window.event;
    e.preventDefault();
    if (Control.var.isMouseDown) {
        var newMouseX = (e.pageX || e.clientX);
        var newMouseY = (e.pageY || e.clientY);
        Control.var.angleX = (newMouseX - Control.var.lastMouseX + Control.var.currMouseX);
        Control.var.angleY = (newMouseY - Control.var.lastMouseY + Control.var.currMouseY);
    }
};

Control.setMouseSensitivity = function(sensitivity) {
    Control.var.mouseSensitivity = sensitivity;
};
