package model

// Episode stores details about an individual chapter/episode.
type Episode struct {
	EpisodeNo  int    `json:"episode_no"`
	Title      string `json:"title"`
	URL        string `json:"url"`
	ChNum      string `json:"ch_num,omitempty"`
	FolderName string `json:"folder_name,omitempty"`
}

// DownloadConfig holds configuration parameters for a download job.
type DownloadConfig struct {
	OutputDir     string
	Format        string // WEBP, JPEG, PNG
	MaxWorkers    int
	Quality       int
	StopRequested *int32 // Atomic stop flag pointer
}

// WorkerStatus represents real-time progress status of an active worker thread.
type WorkerStatus struct {
	ID        int     `json:"id"`
	ImageFile string  `json:"imageFile"`
	Status    string  `json:"status"`
	Progress  float64 `json:"progress"`
	Active    bool    `json:"active"`
}

// ImageTask represents an individual image download task.
type ImageTask struct {
	Index              int
	URL                string
	EncryptionKey      string
	Viewer             string
	Dir                string
	Ext                string
	Format             string
	GlobalIndex        int
	ChNum              string
	ChIdx              int
	ChapterTotalImages int
}
