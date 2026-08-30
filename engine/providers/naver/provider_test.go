package naver

import (
	"testing"
)

func TestNaverProviderCanHandle(t *testing.T) {
	p := NewNaverProvider("ko")

	if p.SourceID() != "naver_ko" {
		t.Errorf("expected sourceID naver_ko, got %s", p.SourceID())
	}
	if p.Name() != "Naver Webtoon (Korean)" {
		t.Errorf("expected name Naver Webtoon (Korean), got %s", p.Name())
	}

	validInputs := []string{
		"https://comic.naver.com/webtoon/list?titleId=183559",
		"https://comic.naver.com/webtoon/detail?titleId=183559&no=654",
		"https://m.comic.naver.com/webtoon/list?titleId=790713",
		"naver:183559",
		"NAVER:648419",
	}

	for _, input := range validInputs {
		if !p.CanHandle(input) {
			t.Errorf("expected CanHandle to be true for: %s", input)
		}
	}

	invalidInputs := []string{
		"https://www.webtoons.com/id/drama/7-wonders/list?title_no=521",
		"https://mangaplus.shueisha.co.jp/titles/100141",
		"https://google.com",
		"random text",
	}

	for _, input := range invalidInputs {
		if p.CanHandle(input) {
			t.Errorf("expected CanHandle to be false for: %s", input)
		}
	}
}
