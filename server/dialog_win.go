package server

import (
	"runtime"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	modOle32             = windows.NewLazySystemDLL("ole32.dll")
	procCoCreateInstance = modOle32.NewProc("CoCreateInstance")
	procCoInitializeEx   = modOle32.NewProc("CoInitializeEx")
	procCoUninitialize   = modOle32.NewProc("CoUninitialize")
	procCoTaskMemFree    = modOle32.NewProc("CoTaskMemFree")
)

const (
	FOS_PICKFOLDERS          = 0x20
	FOS_FORCEFILESYSTEM      = 0x40
	SIGDN_FILESYSPATH        = 0x80058000
	COINIT_APARTMENTTHREADED = 0x2
)

type iUnknownVtbl struct {
	QueryInterface uintptr
	AddRef         uintptr
	Release        uintptr
}

type iFileOpenDialogVtbl struct {
	iUnknownVtbl
	Show                uintptr // 3
	SetFileTypes        uintptr // 4
	SetFileTypeIndex    uintptr // 5
	GetFileTypeIndex    uintptr // 6
	Advise              uintptr // 7
	Unadvise            uintptr // 8
	SetOptions          uintptr // 9
	GetOptions          uintptr // 10
	SetDefaultFolder    uintptr // 11
	SetFolder           uintptr // 12
	GetFolder           uintptr // 13
	GetCurrentSelection uintptr // 14
	SetFileName         uintptr // 15
	GetFileName         uintptr // 16
	SetTitle            uintptr // 17
	SetOkButtonLabel    uintptr // 18
	SetFileNameLabel    uintptr // 19
	GetResult           uintptr // 20
}

type iShellItemVtbl struct {
	iUnknownVtbl
	BindToHandler  uintptr // 3
	GetParent      uintptr // 4
	GetDisplayName uintptr // 5
}

type iFileOpenDialog struct {
	vtbl *iFileOpenDialogVtbl
}

type iShellItem struct {
	vtbl *iShellItemVtbl
}

// ShowModernFileExplorerPicker opens the native VS Code style Windows File Explorer Folder Picker via Win32 COM
func ShowModernFileExplorerPicker() (string, bool) {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	hr, _, _ := procCoInitializeEx.Call(0, COINIT_APARTMENTTHREADED)
	if hr == 0 || hr == 1 {
		defer procCoUninitialize.Call()
	}

	clsid, _ := windows.GUIDFromString("{DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7}")
	iidUnknown, _ := windows.GUIDFromString("{00000000-0000-0000-C000-000000000046}")

	var dlg *iFileOpenDialog
	ret, _, _ := procCoCreateInstance.Call(
		uintptr(unsafe.Pointer(&clsid)),
		0,
		1, // CLSCTX_INPROC_SERVER
		uintptr(unsafe.Pointer(&iidUnknown)),
		uintptr(unsafe.Pointer(&dlg)),
	)
	if ret != 0 || dlg == nil {
		return "", false
	}
	defer syscall.SyscallN(dlg.vtbl.Release, uintptr(unsafe.Pointer(dlg)))

	// Configure FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM to display VS Code style Open Folder Dialog
	var options uint32
	syscall.SyscallN(dlg.vtbl.GetOptions, uintptr(unsafe.Pointer(dlg)), uintptr(unsafe.Pointer(&options)))
	options |= FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM
	syscall.SyscallN(dlg.vtbl.SetOptions, uintptr(unsafe.Pointer(dlg)), uintptr(options))

	titlePtr, _ := windows.UTF16PtrFromString("Open Folder")
	syscall.SyscallN(dlg.vtbl.SetTitle, uintptr(unsafe.Pointer(dlg)), uintptr(unsafe.Pointer(titlePtr)))

	btnPtr, _ := windows.UTF16PtrFromString("Select folder")
	syscall.SyscallN(dlg.vtbl.SetOkButtonLabel, uintptr(unsafe.Pointer(dlg)), uintptr(unsafe.Pointer(btnPtr)))

	// Show(hwndOwner = 0)
	ret, _, _ = syscall.SyscallN(dlg.vtbl.Show, uintptr(unsafe.Pointer(dlg)), 0)
	if ret != 0 {
		return "", false // User cancelled
	}

	// GetResult(&item)
	var item *iShellItem
	ret, _, _ = syscall.SyscallN(dlg.vtbl.GetResult, uintptr(unsafe.Pointer(dlg)), uintptr(unsafe.Pointer(&item)))
	if ret != 0 || item == nil {
		return "", false
	}
	defer syscall.SyscallN(item.vtbl.Release, uintptr(unsafe.Pointer(item)))

	// GetDisplayName(SIGDN_FILESYSPATH, &pathPtr)
	var pathPtr *uint16
	ret, _, _ = syscall.SyscallN(item.vtbl.GetDisplayName, uintptr(unsafe.Pointer(item)), SIGDN_FILESYSPATH, uintptr(unsafe.Pointer(&pathPtr)))
	if ret != 0 || pathPtr == nil {
		return "", false
	}
	defer procCoTaskMemFree.Call(uintptr(unsafe.Pointer(pathPtr)))

	folderPath := windows.UTF16PtrToString(pathPtr)
	if folderPath != "" {
		return folderPath, true
	}
	return "", false
}
