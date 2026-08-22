# frozen_string_literal: true

require "minitest/autorun"
require "tmpdir"
require "yaml"

require_relative "../scripts/sync_gtsam_posts"

class SyncGtsamPostsTest < Minitest::Test
  def test_generates_canonical_urls_and_sorts_newest_first
    in_test_site do |posts_directory, output_file|
      write_post(posts_directory, "2024-01-02-older.md", "title: \"Older\"\ncategories: gtsam.org")
      write_post(posts_directory, "2025-03-04-Newer.md", 'title: "Newer"')

      posts = GtsamPostSync.sync(posts_directory, output_file)

      assert_equal ["Newer", "Older"], posts.map { |post| post.fetch("title") }
      assert_equal "2025-03-04", posts.first.fetch("date")
      assert_equal "https://gtsam.org/2025/03/04/Newer.html", posts.first.fetch("url")
      assert_equal "https://gtsam.org/gtsam.org/2024/01/02/older.html", posts.last.fetch("url")
    end
  end

  def test_honors_explicit_permalink_and_normalizes_https
    in_test_site do |posts_directory, output_file|
      write_post(
        posts_directory,
        "2025-03-04-example.md",
        "title: \"Example\"\npermalink: http://gtsam.org/news/:year/:title/"
      )

      post = GtsamPostSync.sync(posts_directory, output_file).first

      assert_equal "https://gtsam.org/news/2025/example/", post.fetch("url")
    end
  end

  def test_skips_unpublished_posts
    in_test_site do |posts_directory, output_file|
      write_post(posts_directory, "2025-01-01-public.md", 'title: "Public"')
      write_post(posts_directory, "2025-01-02-private.md", "title: \"Private\"\npublished: false")

      posts = GtsamPostSync.sync(posts_directory, output_file)

      assert_equal ["Public"], posts.map { |post| post.fetch("title") }
    end
  end

  def test_rejects_malformed_front_matter
    in_test_site do |posts_directory, output_file|
      path = File.join(posts_directory, "2025-01-01-broken.md")
      File.write(path, "---\ntitle: [\n---\n")

      error = assert_raises(GtsamPostSync::SyncError) do
        GtsamPostSync.sync(posts_directory, output_file)
      end

      assert_match(/invalid YAML front matter/, error.message)
    end
  end

  def test_derives_a_title_when_front_matter_is_absent
    in_test_site do |posts_directory, output_file|
      path = File.join(posts_directory, "2025-01-01-legged-robot-factors-part-I.md")
      File.write(path, "Post body.\n")

      post = GtsamPostSync.sync(posts_directory, output_file).first

      assert_equal "Legged Robot Factors Part I", post.fetch("title")
    end
  end

  def test_rejects_duplicate_urls
    in_test_site do |posts_directory, output_file|
      write_post(posts_directory, "2025-01-01-first.md", "title: \"First\"\npermalink: /same/")
      write_post(posts_directory, "2025-01-02-second.md", "title: \"Second\"\npermalink: /same/")

      error = assert_raises(GtsamPostSync::SyncError) do
        GtsamPostSync.sync(posts_directory, output_file)
      end

      assert_match(/duplicate post URL/, error.message)
    end
  end

  def test_output_is_deterministic
    in_test_site do |posts_directory, output_file|
      write_post(posts_directory, "2025-01-01-example.md", 'title: "Example"')

      GtsamPostSync.sync(posts_directory, output_file)
      first_output = File.read(output_file)
      GtsamPostSync.sync(posts_directory, output_file)

      assert_equal first_output, File.read(output_file)
      assert_equal GtsamPostSync::GENERATED_HEADER, first_output.lines.first
      assert_equal "Example", YAML.safe_load(first_output).first.fetch("title")
    end
  end

  private

  def in_test_site
    Dir.mktmpdir do |directory|
      File.write(File.join(directory, "_config.yml"), "url: http://gtsam.org\nbaseurl: \"\"\n")
      posts_directory = File.join(directory, "_posts")
      Dir.mkdir(posts_directory)
      yield posts_directory, File.join(directory, "gtsam_posts.yml")
    end
  end

  def write_post(posts_directory, filename, front_matter)
    File.write(File.join(posts_directory, filename), "---\n#{front_matter}\n---\nPost body.\n")
  end
end
