//// THIS CODE AND INFORMATION IS PROVIDED "AS IS" WITHOUT WARRANTY OF
//// ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO
//// THE IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A
//// PARTICULAR PURPOSE.
////
//// Copyright (c) Microsoft Corporation. All rights reserved


// 有关“空白”模板的简介，请参阅以下文档:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";
    var mediaCaptureMgr = null;
    var deviceList = null;
    var recordState = null;
    var captureInitSettings = null;
    var rotateVideoOnOrientationChange = true;
    var reverseVideoRotation = false;
    WinJS.Binding.optimizeBindingReferences = true;
    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: 此应用程序刚刚启动。在此处初始化
                //您的应用程序。
                displayShape("此应用程序刚刚启动");
            } else {
                // TODO: 此应用程序已从挂起状态重新激活。
                // 在此处恢复应用程序状态。
                // startPreview();
                displayShape(" 此应用程序已从挂起状态重新激活");
            }
            id("btnStartDevice").addEventListener("click", startDevice, false);
            id("btnStartPreview").addEventListener("click", startPreview, false);

            enumerateCameras();
            id("cameraSelect").addEventListener("change", startDevice, false);
            args.setPromise(WinJS.UI.processAll());
        }
    };
    app.oncheckpoint = function (args) {
        // TODO: 即将挂起此应用程序。在此处保存
        //需要在挂起中保留的任何状态。您可以使用
        // WinJS.Application.sessionState 对象，该对象将在
        //挂起中自动保存和恢复。如果您需要在
        //挂起应用程序之前完成异步操作，请调用
        // args.setPromise()。
        releaseMediaCapture();
        document.getElementById("cameraSelect").removeEventListener("change", function () { });
    };
    function releaseMediaCapture() {
        document.getElementById("monitor").src = null;
        mediaCaptureMgr = null;
    }
    function initCaptureSettings() {
        //Initialize capture settings
        captureInitSettings = null;
        captureInitSettings = new Windows.Media.Capture.MediaCaptureInitializationSettings();
        captureInitSettings.audioDeviceId = "";
        captureInitSettings.videoDeviceId = "";
        captureInitSettings.photoCaptureSource = Windows.Media.Capture.PhotoCaptureSource.videoPreview;
        captureInitSettings.streamingCaptureMode = Windows.Media.Capture.StreamingCaptureMode.audioAndVideo;
        //If the user chosen another webcam, use that webcam by default
        var selectedIndex = id("cameraSelect").selectedIndex;
        var deviceInfo = deviceList[selectedIndex];
        displayShape("已选择设备：" + deviceList[selectedIndex].name);
        captureInitSettings.videoDeviceId = deviceInfo.id;

        var cameraLocation = null;

        if (deviceInfo.enclosureLocation) {
            cameraLocation = deviceInfo.enclosureLocation.panel;
        }

        if (cameraLocation === Windows.Devices.Enumeration.Panel.back) {
            rotateVideoOnOrientationChange = true;
            reverseVideoRotation = false;
        } else if (cameraLocation === Windows.Devices.Enumeration.Panel.front) {
            rotateVideoOnOrientationChange = true;
            reverseVideoRotation = true;
        } else {
            rotateVideoOnOrientationChange = false;
        }
        // startDevice();
    }
    function startDevice() {
        //Initialize media capture with the settings
        displayShape("正在启动设备");
        releaseMediaCapture();
        initCaptureSettings();
        mediaCaptureMgr = new Windows.Media.Capture.MediaCapture();
        mediaCaptureMgr.addEventListener("failed", errorHandler, false);
        mediaCaptureMgr.initializeAsync(captureInitSettings).done(function (result) {
            displayShape("设备已启动");
            mediaCaptureMgr.addEventListener("recordlimitationexceeded", function () {
                if (recordState) {
                    displayShape("由于超过了最长录制时长，已停止录制");
                    stopRecord();
                }
            });
            mediaCaptureMgr.addEventListener("failed", failedEventHandler);
            startPreview();
        }, errorHandler);
    }
    function startPreview() {
        displayShape("正在启动预览");
        updatePreviewForRotation();
        var video = id("monitor");
        video.src = URL.createObjectURL(mediaCaptureMgr, { oneTimeOnly: true });
        video.play();
        displayShape("预览已启动");
    }
    function updatePreviewForRotation() {
        if (!mediaCaptureMgr) {
            return;
        }
        var previewMirroring = mediaCaptureMgr.getPreviewMirroring();
        var counterclockwiseRotation = (previewMirroring && !reverseVideoRotation) ||
            (!previewMirroring && reverseVideoRotation);

        if (rotateVideoOnOrientationChange) {
            mediaCaptureMgr.setPreviewRotation(videoRotationLookup(Windows.Graphics.Display.DisplayProperties.currentOrientation, counterclockwiseRotation));
        } else {
            mediaCaptureMgr.setPreviewRotation(Windows.Media.Capture.VideoRotation.none);
        }
    }
    function enumerateCameras() {
        displayShape("列出网络摄像头");
        var cameraSelect = id("cameraSelect");
        deviceList = null;
        deviceList = new Array();
        while (cameraSelect.length > 0) {
            cameraSelect.remove(0);
        }
        //Enumerate webcams and add them to the list
        var deviceInfo = Windows.Devices.Enumeration.DeviceInformation;
        deviceInfo.findAllAsync(Windows.Devices.Enumeration.DeviceClass.videoCapture).done(function (devices) {
            // Add the devices to deviceList
            displayShape("网络摄像头列出完毕");
            if (devices.length > 0) {
                for (var i = 0; i < devices.length; i++) {
                    deviceList.push(devices[i]);
                    cameraSelect.add(new Option(deviceList[i].name), i);
                }
                //Select the first webcam
                cameraSelect.selectedIndex = 0;
                startDevice();
            } else {
                displayError("没有找到摄像头设备");
            }
        }, errorHandler);
    }
    app.start();
})();
function id(elementId) {
    return document.getElementById(elementId);
}
function displayError(str) {
    var errors = document.getElementById("errors");
    errors.textContent = str + '\n' + errors.textContent;
}
function displayShape(str) {
    if (true) {
        var shapes = document.getElementById("shapes");
        shapes.textContent = str + '\n' + shapes.textContent;
    }
}
function errorHandler(err) {
    displayError(err.message);
}
function failedEventHandler(e) {
    displayError("Fatal error", e.message);
}
function videoRotationLookup(displayOrientation, counterclockwise) {
    switch (displayOrientation) {
        case Windows.Graphics.Display.DisplayOrientations.landscape:
            return Windows.Media.Capture.VideoRotation.none;

        case Windows.Graphics.Display.DisplayOrientations.portrait:
            return (counterclockwise) ? Windows.Media.Capture.VideoRotation.clockwise270Degrees :
                Windows.Media.Capture.VideoRotation.clockwise90Degrees;

        case Windows.Graphics.Display.DisplayOrientations.landscapeFlipped:
            return Windows.Media.Capture.VideoRotation.clockwise180Degrees;

        case Windows.Graphics.Display.DisplayOrientations.portraitFlipped:
            return (counterclockwise) ? Windows.Media.Capture.VideoRotation.clockwise90Degrees :
                Windows.Media.Capture.VideoRotation.clockwise270Degrees;

        default:
            return Windows.Media.Capture.VideoRotation.none;
    }
}

function popup(message) {
    Windows.UI.Popups.MessageDialog(message).showAsync();
}

function about() {
    var message = 'Simple Monitor\n' +
        '本应用的部分代码基于 Microsoft Windows 8 App Samples，\n版权归 © Microsoft Corporation 所有。\n' +
        'This application contains portions of code from Microsoft Windows 8 App Samples,\n© Microsoft Corporation.\n' +
        '启动画面和图标来自米游社用户久梦/黑巧\n' +
        '\n'
    ;
    var msg = new Windows.UI.Popups.MessageDialog(message, "关于 About");


    msg.commands.append(new Windows.UI.Popups.UICommand("MS-LPL License", function () {

        Windows.ApplicationModel.Package.current.installedLocation
            .getFileAsync("MS-LPL.rtf")
            .then(function (file) {
                return Windows.System.Launcher.launchFileAsync(file);
            });
    }));

    msg.commands.append(new Windows.UI.Popups.UICommand("消除 Dismiss"));

    msg.defaultCommandIndex = 1;
    msg.cancelCommandIndex = 1;

    msg.showAsync();
}
