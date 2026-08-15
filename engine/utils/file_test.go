package utils

import (
	"testing"

	"uni-scraper-go/engine/model"
)

func TestAssignChapterDisplayNumbers(t *testing.T) {
	episodes := []model.Episode{
		{EpisodeNo: 1, Title: "Prologue"},
		{EpisodeNo: 2, Title: "Chapter 1"},
		{EpisodeNo: 3, Title: "Special Episode"},
		{EpisodeNo: 4, Title: "Chapter 2"},
	}

	AssignChapterDisplayNumbers(episodes)

	wantNumbers := []string{"000.5", "001", "001.5", "002"}
	for i, want := range wantNumbers {
		if episodes[i].ChNum != want {
			t.Fatalf("episode %d: got ChNum %q, want %q", i, episodes[i].ChNum, want)
		}
		wantFolder := "Chapter " + want + " - " + episodes[i].Title
		if episodes[i].FolderName != wantFolder {
			t.Fatalf("episode %d: got FolderName %q, want %q", i, episodes[i].FolderName, wantFolder)
		}
	}
}

func TestAssignChapterDisplayNumbersAvoidsSpecialFolderCollisions(t *testing.T) {
	episodes := []model.Episode{
		{EpisodeNo: 1, Title: "Prologue"},
		{EpisodeNo: 2, Title: "Extra"},
		{EpisodeNo: 3, Title: "Chapter 1"},
	}

	AssignChapterDisplayNumbers(episodes)

	if episodes[0].ChNum != "000.5" || episodes[1].ChNum != "000.6" {
		t.Fatalf("got special chapter numbers %q and %q, want 000.5 and 000.6", episodes[0].ChNum, episodes[1].ChNum)
	}
}
