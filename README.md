# dellaert.github.io

This repository contains [Frank Dellaert's academic website](https://dellaert.github.io/). It is a Jekyll site based on the AcademicPages fork of the Minimal Mistakes theme and is deployed to GitHub Pages with GitHub Actions.

## Site content

- `_config.yml` contains site-wide settings and profile links.
- `_pages/` contains the main pages, including the Blog archive.
- `_posts/` contains posts hosted directly on this site.
- `_publications/`, `_talks/`, and `_teaching/` contain the corresponding academic collections.
- `_data/gtsam_posts.yml` is a generated index of posts published on [GTSAM.org](https://gtsam.org/blog/).

## Local development

Install Ruby 3.3 and Bundler, then install the locked dependencies:

```sh
bundle install
```

To include the current GTSAM.org post index, clone its public repository once:

```sh
git clone --depth 1 https://github.com/borglab/gtsam.org.git .gtsam-source
bundle exec ruby scripts/sync_gtsam_posts.rb .gtsam-source/_posts _data/gtsam_posts.yml
```

For later refreshes, update the checkout and rerun the importer:

```sh
git -C .gtsam-source pull --ff-only
bundle exec ruby scripts/sync_gtsam_posts.rb .gtsam-source/_posts _data/gtsam_posts.yml
```

Serve the site with automatic rebuilding at <http://localhost:4000>:

```sh
bundle exec jekyll serve --livereload
```

Create the same production build used by GitHub Pages with:

```sh
JEKYLL_ENV=production bundle exec jekyll build
```

The committed `_data/gtsam_posts.yml` allows offline builds. Running the synchronization command updates that baseline and makes any upstream changes visible in the local Git diff.

## Deployment and GTSAM synchronization

The workflow in `.github/workflows/pages.yml` builds the site in four situations:

- Pull requests targeting `master` build and test the complete Pages artifact without deploying it.
- Pushes to `master` build and deploy the site.
- The manual **Run workflow** action builds and deploys on demand.
- A daily schedule at 10:17 UTC refreshes the deployed GTSAM.org post index without committing generated changes.

Every workflow run checks out `borglab/gtsam.org`, tests the importer, regenerates `_data/gtsam_posts.yml`, and then builds Jekyll. If synchronization or the build fails, deployment does not run and the existing website stays online.

GitHub automatically disables scheduled workflows in public repositories after 60 days without repository activity. If automatic refreshes stop, open the repository's **Actions** tab, select **Deploy Jekyll site to Pages**, enable the workflow if necessary, and use **Run workflow** for an immediate refresh. Committing a workflow change also re-enables its schedule.

## Dependency maintenance

`Gemfile.lock` is intentionally committed so local and CI builds use tested dependency versions. To update dependencies, run:

```sh
bundle update
bundle exec ruby test/sync_gtsam_posts_test.rb
bundle exec jekyll build
```

Review and commit both `Gemfile` and `Gemfile.lock` changes when applicable. Do not delete the lockfile to address dependency alerts; update the affected gems and validate the resulting build instead.

## Attribution and license

The site began with [AcademicPages](https://academicpages.github.io/), which was derived from the [Minimal Mistakes Jekyll theme](https://mmistakes.github.io/minimal-mistakes/). The theme is Copyright © 2016 Michael Rose and is distributed under the [MIT License](LICENSE).
