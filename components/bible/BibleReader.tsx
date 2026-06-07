'use client'

import { Toaster } from 'sonner'
import { useBibleReader } from './useBibleReader'
import { BibleTopBar } from './BibleTopBar'
import {
  BibleSearchView, BibleSavedView, BibleVersionPicker,
  BibleBookBrowser, BibleChapterBrowser,
} from './BibleBrowserViews'
import { BibleReadView } from './BibleReadView'
import { BibleCompareView } from './BibleCompareView'
import { BibleNoteModal } from './BibleNoteModal'

export default function BibleReader() {
  const r = useBibleReader()

  return (
    <div className={`min-h-screen bg-background font-sans ${r.view === 'read' ? 'pb-44' : 'pb-28'}`}>
      <Toaster position="bottom-center" richColors />

      <BibleTopBar
        view={r.view}
        setView={r.setView}
        selectedBook={r.selectedBook}
        selectedChapter={r.selectedChapter}
        translation={r.translation}
        selectedVerses={r.selectedVerses}
        setSelectedVerses={r.setSelectedVerses}
        setShowHighlightPanel={r.setShowHighlightPanel}
        bookSort={r.bookSort}
        setBookSort={r.setBookSort}
        showRecent={r.showRecent}
        setShowRecent={r.setShowRecent}
        searchQuery={r.searchQuery}
        setSearchQuery={r.setSearchQuery}
        setSearchResults={r.setSearchResults}
        fontSize={r.fontSize}
        fontSizeNext={r.fontSizeNext}
        setFontSize={r.setFontSize}
        router={r.router}
      />

      {r.view === 'search' && (
        <BibleSearchView
          searching={r.searching}
          searchQuery={r.searchQuery}
          searchResults={r.searchResults}
        />
      )}

      {r.view === 'saved' && (
        <BibleSavedView savedVerses={r.savedVerses} />
      )}

      {r.view === 'versions' && (
        <BibleVersionPicker
          versionLang={r.versionLang}
          setVersionLang={r.setVersionLang}
          translation={r.translation}
          setTranslation={r.setTranslation}
          setView={r.setView}
        />
      )}

      {r.view === 'books' && (
        <BibleBookBrowser
          bookSearch={r.bookSearch}
          setBookSearch={r.setBookSearch}
          showRecent={r.showRecent}
          bookSort={r.bookSort}
          displayedBooks={r.displayedBooks}
          openBook={r.openBook}
          translation={r.translation}
        />
      )}

      {r.view === 'chapters' && (
        <BibleChapterBrowser
          selectedBook={r.selectedBook}
          selectedChapter={r.selectedChapter}
          openChapter={r.openChapter}
          translation={r.translation}
        />
      )}

      {r.view === 'read' && (
        <BibleReadView
          readScrollRef={r.readScrollRef}
          handleTouchStart={r.handleTouchStart}
          handleTouchEnd={r.handleTouchEnd}
          loading={r.loading}
          error={r.error}
          verses={r.verses}
          selectedBook={r.selectedBook}
          selectedChapter={r.selectedChapter}
          highlights={r.highlights}
          selectedVerses={r.selectedVerses}
          setSelectedVerses={r.setSelectedVerses}
          showHighlightPanel={r.showHighlightPanel}
          setShowHighlightPanel={r.setShowHighlightPanel}
          fontSizeClass={r.fontSizeClass}
          translation={r.translation}
          savedIds={r.savedIds}
          savingSelection={r.savingSelection}
          formatRef={r.formatRef}
          copySelectedVerses={r.copySelectedVerses}
          shareSelectedVerses={r.shareSelectedVerses}
          saveSelectedVerses={r.saveSelectedVerses}
          highlightSelectedVerses={r.highlightSelectedVerses}
          openNoteForSelection={r.openNoteForSelection}
          openCompare={r.openCompare}
          showChapterSheet={r.showChapterSheet}
          setShowChapterSheet={r.setShowChapterSheet}
          setSelectedChapter={r.setSelectedChapter}
          prevChapter={r.prevChapter}
          nextChapter={r.nextChapter}
        />
      )}

      {r.view === 'compare' && (
        <BibleCompareView
          compareTranslations={r.compareTranslations}
          compareData={r.compareData}
          compareLoadingSet={r.compareLoadingSet}
          compareVerseNums={r.compareVerseNums}
          selectedBook={r.selectedBook}
          selectedChapter={r.selectedChapter}
          translation={r.translation}
          fontSizeClass={r.fontSizeClass}
          formatRef={r.formatRef}
          removeCompareTranslation={r.removeCompareTranslation}
          showAddTranslation={r.showAddTranslation}
          setShowAddTranslation={r.setShowAddTranslation}
          addCompareTranslation={r.addCompareTranslation}
        />
      )}

      {r.noteVerse && (
        <BibleNoteModal
          noteVerse={r.noteVerse}
          noteContent={r.noteContent}
          setNoteContent={r.setNoteContent}
          noteRef={r.noteRef}
          noteIsMulti={r.noteIsMulti}
          savingNote={r.savingNote}
          selectedBook={r.selectedBook}
          selectedChapter={r.selectedChapter}
          translation={r.translation}
          onClose={() => { r.setNoteVerse(null); r.setNoteContent('') }}
          onSave={() => r.addVerseNote(r.noteVerse!, r.noteContent)}
        />
      )}
    </div>
  )
}
