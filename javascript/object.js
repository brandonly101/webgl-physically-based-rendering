// Copyright Brandon Ly 2015 all rights reserved.

// Small module that handles the creation of meshes and objects and their properties.

"use strict";

// Define a mesh object class.
class Mesh
{
    constructor()
    {
        this.vertices = null;
        this.texcoords = null;
        this.normals = null;
        this.indices = null;
        this.indicesNum = 0;
        this.bUseDrawArrays = false;

        this.materialAmbient = [1.0, 1.0, 1.0, 1.0];
        this.materialDiffuse = [1.0, 1.0, 1.0, 1.0];
        this.materialSpecular = [1.0, 1.0, 1.0, 1.0];
    }

    // Create a mesh from a source file.
    static createMesh(src)
    {
        var result = new Mesh();

        result.vertices = [];
        result.texcoords = [];
        result.normals = [];
        result.indices = [];

        let vertices = [];
        let texcoords = [];
        let normals = [];
        let faces = [];

        var arrObjLines = src.split("\n");
        arrObjLines.forEach((elem) =>
        {
            let arrElem = elem.replace(/\s{2,}/g, ' ').split(" ");
            switch (arrElem[0])
            {
            case "v":
                vertices.push(
                {
                    "x": Number.parseFloat(arrElem[1]),
                    "y": Number.parseFloat(arrElem[2]),
                    "z": Number.parseFloat(arrElem[3])
                });
                break;
            case "vt":
                texcoords.push(
                {
                    "u": Number.parseFloat(arrElem[1]),
                    "v": Number.parseFloat(arrElem[2])
                });
                break;
            case "vn":
                normals.push(
                {
                    "x": Number.parseFloat(arrElem[1]),
                    "y": Number.parseFloat(arrElem[2]),
                    "z": Number.parseFloat(arrElem[3])
                });
                break;
            case "f":
                for (let i = 1; i <= 3; i++)
                {
                    let vertexIndex = 0;
                    let texcoordIndex = 0;
                    let normalIndex = 0;

                    let arrFaces = arrElem[i].split("/");
                    vertexIndex = Number.parseInt(arrFaces[0]) - 1;
                    if (!Number.isNaN(Number.parseFloat(arrFaces[1])))
                    {
                        texcoordIndex = Number.parseFloat(arrFaces[1]) - 1;
                    }
                    if (!Number.isNaN(Number.parseInt(arrFaces[2])))
                    {
                        normalIndex = Number.parseInt(arrFaces[2]) - 1;
                    }
                    faces.push(
                    {
                        "vertexIndex": vertexIndex,
                        "texcoordIndex": texcoordIndex,
                        "normalIndex": normalIndex
                    });
                }
                break;
            }
        });

        // Indicate that we want to use gl.drawArrays() for complex models (for now).
        // Not performant, but maybe some day when I figure out how to properly
        // use an indices array with a format that is not 16-bit.
        result.indicesNum = faces.length;
        result.bUseDrawArrays = true;

        for (let i = 0; i < faces.length; i++)
        {
            let face = faces[i];

            result.vertices.push(vertices[face.vertexIndex].x);
            result.vertices.push(vertices[face.vertexIndex].y);
            result.vertices.push(vertices[face.vertexIndex].z);

            result.texcoords.push(texcoords[face.texcoordIndex].u);
            result.texcoords.push(texcoords[face.texcoordIndex].v);

            result.normals.push(normals[face.normalIndex].x);
            result.normals.push(normals[face.normalIndex].y);
            result.normals.push(normals[face.normalIndex].z);
        }

        return result;
    };

    // Create a cube mesh.
    static createCube()
    {
        var result = new Mesh();

        result.vertices =
        [
            // Front face
            -1.0, -1.0,  1.0,
            1.0, -1.0,  1.0,
            1.0,  1.0,  1.0,
            -1.0,  1.0,  1.0,

            // Back face
            -1.0, -1.0, -1.0,
            -1.0,  1.0, -1.0,
            1.0,  1.0, -1.0,
            1.0, -1.0, -1.0,

            // Top face
            -1.0,  1.0, -1.0,
            -1.0,  1.0,  1.0,
            1.0,  1.0,  1.0,
            1.0,  1.0, -1.0,

            // Bottom face
            -1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
            1.0, -1.0,  1.0,
            -1.0, -1.0,  1.0,

            // Right face
            1.0, -1.0, -1.0,
            1.0,  1.0, -1.0,
            1.0,  1.0,  1.0,
            1.0, -1.0,  1.0,

            // Left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0,  1.0,
            -1.0,  1.0,  1.0,
            -1.0,  1.0, -1.0
        ];

        result.normals =
        [
            // Front face
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,

            // Back Face
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,

            // Top Face
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,

            // Bottom face
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,

            // Right face
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,

            // Left face
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
        ];

        result.indices =
        [
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23    // left
        ];

        return result;
    }

    // Create a sphere mesh.
    static createSphere(nDiv)
    {
        var result = new Mesh();
        result.vertices = [];
        result.normals = [];
        result.indices = [];

        var va = [0, 0, -1];
        var vb = [0.0, 0.942809, 0.333333];
        var vc = [-0.816497, -0.471405, 0.333333];
        var vd = [0.816497, -0.471405, 0.333333];

        function tetrahedron(a, b, c, d, n)
        {
            function triangle(a, b, c)
            {
                // Vertices
                result.indices.push(result.vertices.length/3);
                result.vertices = result.vertices.concat(a);
                result.indices.push(result.vertices.length/3);
                result.vertices = result.vertices.concat(b);
                result.indices.push(result.vertices.length/3);
                result.vertices = result.vertices.concat(c);

                // Normals
                result.normals = result.normals.concat(a);
                result.normals = result.normals.concat(b);
                result.normals = result.normals.concat(c);
            }
            function divideTriangle(a, b, c, count)
            {
                if (count > 0)
                {
                    var ab = GLMathLib.normalize(GLMathLib.mid(a, b));
                    var ac = GLMathLib.normalize(GLMathLib.mid(a, c));
                    var bc = GLMathLib.normalize(GLMathLib.mid(b, c));
                    divideTriangle(a, ab, ac, count - 1);
                    divideTriangle(ab, b, bc, count - 1);
                    divideTriangle(bc, c, ac, count - 1);
                    divideTriangle(ab, bc, ac, count - 1);
                } else {
                    triangle (a, b, c);
                }
            }
            divideTriangle(a, b, c, n);
            divideTriangle(d, c, b, n);
            divideTriangle(a, d, b, n);
            divideTriangle(a, c, d, n);
        }

        // Run the function that calls it all.
        tetrahedron(va, vb, vc, vd, nDiv);

        return result;
    }

    // Create a cube map mesh.
    static createCubeMap(length)
    {
        var result = new Mesh();
        result.vertices =
        [
            // Front face
            -length, -length, -length,
            length, -length, -length,
            length,  length, -length,
            -length,  length, -length,

            // Back face
            -length, -length,  length,
            -length,  length,  length,
            length,  length,  length,
            length, -length,  length,

            // Top face
            -length, -length, -length,
            -length, -length,  length,
            length, -length,  length,
            length, -length, -length,

            // Bottom face
            -length,  length, -length,
            length,  length, -length,
            length,  length,  length,
            -length,  length,  length,

            // Right face
            -length, -length, -length,
            -length,  length, -length,
            -length,  length,  length,
            -length, -length,  length,

            // Left face
            length, -length, -length,
            length, -length,  length,
            length,  length,  length,
            length,  length, -length,
        ];
        result.texCoords =
        [
            // Front
            0.0,  0.0,
            1.0,  0.0,
            1.0,  1.0,
            0.0,  1.0,
            // Back
            0.0,  0.0,
            1.0,  0.0,
            1.0,  1.0,
            0.0,  1.0,
            // Top
            0.0,  0.0,
            1.0,  0.0,
            1.0,  1.0,
            0.0,  1.0,
            // Bottom
            0.0,  0.0,
            1.0,  0.0,
            1.0,  1.0,
            0.0,  1.0,
            // Right
            0.0,  0.0,
            1.0,  0.0,
            1.0,  1.0,
            0.0,  1.0,
            // Right
            0.0,  0.0,
            1.0,  0.0,
            1.0,  1.0,
            0.0,  1.0,
            // Left
            0.0,  0.0,
            1.0,  0.0,
            1.0,  1.0,
            0.0,  1.0
        ];
        result.texCoords =
        [
            // Front face
            -length, -length, -length,
            length, -length, -length,
            length,  length, -length,
            -length,  length, -length,

            // Back face
            -length, -length,  length,
            -length,  length,  length,
            length,  length,  length,
            length, -length,  length,

            // Top face
            -length, -length, -length,
            -length, -length,  length,
            length, -length,  length,
            length, -length, -length,

            // Bottom face
            -length,  length, -length,
            length,  length, -length,
            length,  length,  length,
            -length,  length,  length,

            // Right face
            -length, -length, -length,
            -length,  length, -length,
            -length,  length,  length,
            -length, -length,  length,

            // Left face
            length, -length, -length,
            length, -length,  length,
            length,  length,  length,
            length,  length, -length,
        ];
        result.indices =
        [
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23    // left
        ];

        return result;
    };

    readFile(e)
    {
        var file = e.target.files[0];
        if (!file)
        {
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e)
        {
            var contents = e.target.result;
            displayContents(contents);
        };
        reader.readAsText(file);
    };
}

class RenderObject
{
    constructor(gl,
                mesh,
                glAttribLocations)
    {
        this.gl = gl;
        this.mesh = mesh;
        this.glAttribLocations = glAttribLocations;
        this.buffers = {};
        this.bIsDrawArrays = false;

        // Create vertices buffer.
        this.buffers.vertices = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertices);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.STATIC_DRAW);

        // Create normals buffer, if applicable.
        if (mesh.normals != null)
        {
            this.buffers.normals = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normals);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);
        }

        if (!mesh.bUseDrawArrays)
        {
            // Create vertex indices buffer.
            this.buffers.indices = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);
        }
    }

    render()
    {
        let gl = this.gl;
        let mesh = this.mesh;
        let buffers = this.buffers;

        // Rebind buffers.
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertices);
        gl.vertexAttribPointer(this.glAttribLocations[0], 3, gl.FLOAT, false, 0, 0);

        if (mesh.normals != null && mesh.normals.length != 0)
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals);
            gl.vertexAttribPointer(this.glAttribLocations[1], 3, gl.FLOAT, false, 0, 0);
        }

        // draw
        if (this.mesh.bUseDrawArrays)
        {
            gl.drawArrays(gl.TRIANGLES, 0, mesh.indicesNum);
        }
        else
        {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
            gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
        }
    }
}
