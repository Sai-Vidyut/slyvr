import { useEffect, useState } from "react";

import api, {
  getCategories,
  getPeople,
  createCategory,
  createPerson,
} from "../../services/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface UploadItem {
  file: File;
  title: string;
  description: string;
}

interface Category {
  id: number;
  name: string;
}

interface Person {
  id: number;
  name: string;
}

function UploadModal({
  isOpen,
  onClose,
}: Props) {
  const [files, setFiles] =
    useState<UploadItem[]>([]);

  const [uploading, setUploading] =
    useState(false);
  const [uploadProgress, setUploadProgress] =
    useState(0);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [people, setPeople] =
    useState<Person[]>([]);

  const [selectedCategory,
    setSelectedCategory] =
    useState<number | null>(null);

  const [selectedPeople,
    setSelectedPeople] =
    useState<number[]>([]);

  const [applyTitle,
    setApplyTitle] =
    useState("");

  const [applyDescription,
    setApplyDescription] =
    useState("");

  const [newCategory,
    setNewCategory] =
    useState("");

  const [newPerson,
    setNewPerson] =
    useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const cats =
          await getCategories();

        const persons =
          await getPeople();

        setCategories(cats);
        setPeople(persons);
      } catch (err) {
        console.error(err);
      }
    };

    loadData();
  }, []);

  if (!isOpen) return null;

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(
      e.target.files || []
    );

    const newFiles: UploadItem[] =
      selectedFiles.map((file) => ({
        file,
        title: "",
        description: "",
      }));

    setFiles(newFiles);
  };

  const updateFile = (
    index: number,
    field: keyof UploadItem,
    value: string
  ) => {
    const updated = [...files];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    setFiles(updated);
  };

  const applyToAll = () => {
    const updated = files.map(
      (item, index) => ({
        ...item,

        title:
          files.length === 1
            ? applyTitle
            : index === 0
            ? applyTitle
            : `${applyTitle} (${index})`,

        description:
          applyDescription,
      })
    );

    setFiles(updated);
  };
  
  const handleAddCategory =
    async () => {
      if (!newCategory.trim())
        return;

      try {
        const category =
          await createCategory(
            newCategory
          );

        setCategories([
          ...categories,
          category,
        ]);

        setSelectedCategory(
          category.id
        );

        setNewCategory("");
      } catch (err) {
        console.error(err);
        alert(
          "Failed to create category"
        );
      }
    };

  const handleAddPerson =
    async () => {
      if (!newPerson.trim())
        return;

      try {
        const person =
          await createPerson(
            newPerson
          );

        setPeople([
          ...people,
          person,
        ]);

        setSelectedPeople([
          ...selectedPeople,
          person.id,
        ]);

        setNewPerson("");
      } catch (err) {
        console.error(err);
        alert(
          "Failed to create person"
        );
      }
    };

  const togglePerson = (
    personId: number
  ) => {
    if (
      selectedPeople.includes(
        personId
      )
    ) {
      setSelectedPeople(
        selectedPeople.filter(
          (id) =>
            id !== personId
        )
      );
    } else {
      setSelectedPeople([
        ...selectedPeople,
        personId,
      ]);
    }
  };

  const handleUpload =
    async () => {
      if (
        files.length === 0
      ) {
        alert(
          "Please select at least one video"
        );
        return;
      }

      try {
        setUploading(true);
        setUploadProgress(0);

        await Promise.all(
          files.map(
            async (item) => {
              const formData =
                new FormData();

              formData.append(
                "video",
                item.file
              );

              formData.append(
                "title",
                item.title
              );

              formData.append(
                "description",
                item.description
              );

              if (
                selectedCategory
              ) {
                formData.append(
                  "category_id",
                  selectedCategory.toString()
                );
              }

              formData.append(
                "person_ids",
                selectedPeople.join(
                  ","
                )
              );

              return api.post(
                "/upload",
                formData,
                {
                    headers: {
                        "Content-Type":
                        "multipart/form-data",
                    },
                    onUploadProgress: (
                        progressEvent
                    ) => {
                        const percent =
                           Math.round(
                            (
                                (progressEvent.loaded || 0) *
                                100
                            ) /
                            (progressEvent.total || 1)
                        );
                        setUploadProgress(
                            percent
                        );
                    },
                }
            );
            }
          )
        );

        alert(
          `${files.length} file(s) uploaded successfully`
        );

        window.location.reload();
      } catch (error) {
        console.error(
          error
        );

        alert(
          "One or more uploads failed"
        );
      } finally {
        setUploading(false);
      }
    };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-[900px] max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl p-6">

        <h2 className="text-3xl font-bold mb-6">
          Upload Videos
        </h2>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 mb-6">
          <h3 className="font-semibold mb-4">
            Apply To All
          </h3>

          <div className="space-y-3">
            <input
              placeholder="Base Title"
              value={applyTitle}
              onChange={(e) =>
                setApplyTitle(
                  e.target.value
                )
              }
              className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3"
            />

            <textarea
              placeholder="Description"
              value={
                applyDescription
              }
              onChange={(e) =>
                setApplyDescription(
                  e.target.value
                )
              }
              rows={3}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3"
            />

            <button
              onClick={applyToAll}
              className="rounded-xl bg-cyan-500 px-5 py-3 text-black font-medium"
            >
              Apply To All
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="font-semibold mb-3">
              Category
            </h3>

            <select
              value={
                selectedCategory ??
                ""
              }
              onChange={(e) =>
                setSelectedCategory(
                  Number(
                    e.target.value
                  )
                )
              }
              className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3"
            >
              <option value="">
                Select Category
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {
                      category.name
                    }
                  </option>
                )
              )}
            </select>

            <div className="flex gap-2 mt-3">
              <input
                placeholder="New Category"
                value={
                  newCategory
                }
                onChange={(e) =>
                  setNewCategory(
                    e.target.value
                  )
                }
                className="flex-1 rounded-xl bg-slate-900 border border-slate-700 p-3"
              />

              <button
                onClick={
                  handleAddCategory
                }
                className="px-4 rounded-xl bg-cyan-500 text-black"
              >
                +
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="font-semibold mb-3">
              People
            </h3>

            <div className="max-h-52 overflow-y-auto space-y-2 mb-3">
              {people.map((person) => (
                <label
                  key={person.id}
                  className="flex items-center gap-3 rounded-xl bg-slate-900 p-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPeople.includes(
                      person.id
                    )}
                    onChange={() =>
                      togglePerson(
                        person.id
                      )
                    }
                  />

                  <span>
                    {person.name}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                placeholder="New Person"
                value={newPerson}
                onChange={(e) =>
                  setNewPerson(
                    e.target.value
                  )
                }
                className="flex-1 rounded-xl bg-slate-900 border border-slate-700 p-3"
              />

              <button
                onClick={
                  handleAddPerson
                }
                className="px-4 rounded-xl bg-cyan-500 text-black"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div
          className="
            border
            border-dashed
            border-slate-700
            rounded-2xl
            p-6
            text-center
            bg-slate-900/50
            hover:border-cyan-500
            transition-all
            mb-6
          "
        >
          <input
            type="file"
            accept="video/*"
            multiple
            id="video-upload"
            className="hidden"
            onChange={
              handleFileSelect
            }
          />

          <label
            htmlFor="video-upload"
            className="cursor-pointer block"
          >
            <div className="text-4xl mb-2">
              🎬
            </div>

            <p className="text-lg font-semibold">
              Select Videos
            </p>

            <p className="text-sm text-slate-500 mt-1">
              MP4 • MOV • AVI • MXF
            </p>

            {files.length >
              0 && (
              <div className="mt-4 text-cyan-300">
                {
                  files.length
                }{" "}
                file(s)
                selected
              </div>
            )}
          </label>
        </div>

        <div className="space-y-4">
          {files.map(
            (
              item,
              index
            ) => (
              <div
                key={index}
                className="
                  rounded-2xl
                  border
                  border-slate-800
                  bg-slate-900/40
                  p-4
                "
              >
                <div className="mb-3">
                  <p className="font-medium text-cyan-300">
                    {
                      item.file
                        .name
                    }
                  </p>

                  <p className="text-xs text-slate-500">
                    {(
                      item
                        .file
                        .size /
                      1024 /
                      1024
                    ).toFixed(
                      2
                    )}{" "}
                    MB
                  </p>
                </div>

                <div className="space-y-3">
                  <input
                    placeholder="Title *"
                    value={
                      item.title
                    }
                    onChange={(
                      e
                    ) =>
                      updateFile(
                        index,
                        "title",
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3"
                  />

                  <textarea
                    placeholder="Description"
                    value={
                      item.description
                    }
                    onChange={(
                      e
                    ) =>
                      updateFile(
                        index,
                        "description",
                        e.target
                          .value
                      )
                    }
                    rows={3}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3"
                  />
                </div>
              </div>
            )
          )}
        </div>

        {uploading && (
            <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                    <span>
                        Upload Progress
                    </span>
                    
                    <span>
                        {uploadProgress}%
                    </span>
                </div>
                <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden">
                    <div
                    className="
                    h-full
                    bg-cyan-500
                    transition-all
                    duration-300
                    "
                    style={{
                        width: `${uploadProgress}%`,
                    }}
                />
            </div>
        </div>
    )}
    <div className="mt-6 flex gap-3">
        <button
            onClick={
              onClose
            }
            disabled={
              uploading
            }
            className="
              flex-1
              rounded-xl
              bg-slate-800
              p-3
              font-medium
            "
          >
            Cancel
          </button>

          <button
            onClick={
              handleUpload
            }
            disabled={
              uploading
            }
            className="
              flex-1
              rounded-xl
              bg-cyan-500
              p-3
              font-medium
              text-black
              hover:bg-cyan-400
            "
          >
            {uploading
              ? "Uploading..."
              : `Upload ${
                  files.length ||
                  ""
                }`}
          </button>
        </div>
      </div>
    </div>
  );
}
export default UploadModal;