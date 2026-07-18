const confirmDelete = useCallback(async () => {
  if (!firestore || !user || !galleryToDelete) return;

  const idToDelete = galleryToDelete;

  // Dialog turant close kar do
  setGalleryToDelete(null);

  try {
    const docRef = doc(firestore, "galleries", idToDelete);

    // Gallery delete
    await deleteDoc(docRef);

    toast({
      title: "Gallery Deleted",
      description: "Gallery removed successfully.",
    });

  } catch (err: any) {
    console.error("Delete Error:", err);

    if (err?.code === "permission-denied") {
      errorEmitter.emit(
        "permission-error",
        new FirestorePermissionError({
          path: `galleries/${idToDelete}`,
          operation: "delete",
        })
      );
    }

    toast({
      variant: "destructive",
      title: "Delete Failed",
      description: err?.message || "Something went wrong.",
    });
  } finally {
    // Force React ko event loop complete karne do
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50);
  }
}, [firestore, user, galleryToDelete, toast]);