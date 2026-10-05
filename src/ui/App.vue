<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { LocalGardenRepository } from '../adapters/local-garden.repository';
import { EMOTION_META, EMOTIONS, type Emotion } from '../core/models';
import { annualReport, createEntry, sampleSnapshot, syncPlants } from '../core/garden-engine';
import { addProfile, currentProfile, removeProfile, switchProfile } from '../core/profiles';

const repo = new LocalGardenRepository();
const book = reactive(repo.load());
const tab = ref<'花园' | '种植' | '时间轴' | '标本馆' | '年报'>('花园');
const selectedEmotion = ref<Emotion>('喜悦');
const notice = ref('');
const draft = reactive({ note: '', intensity: 3 });

const current = computed(() => currentProfile(book));
const state = computed(() => current.value.garden);
const report = computed(() => annualReport(state.value.entries));
const living = computed(() => state.value.plants.filter((plant) => plant.status === '繁茂'));
const specimens = computed(() => state.value.plants.filter((plant) => plant.status === '枯萎'));
const timeline = computed(() => [...state.value.entries].sort((a, b) => b.date.localeCompare(a.date)));

let noticeTimer: number | undefined;
function flash(message: string) {
  notice.value = message;
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => { notice.value = ''; }, 3500);
}

function persist() {
  state.value.plants = syncPlants(state.value.entries, state.value.plants);
  repo.save(book);
}
function plant() {
  state.value.entries.unshift(createEntry(selectedEmotion.value, draft.note, draft.intensity));
  draft.note = '';
  persist();
  flash(`${EMOTION_META[selectedEmotion.value].plant} 已经种入「${current.value.name}」`);
  tab.value = '花园';
}
function reset() {
  const fresh = sampleSnapshot();
  state.value.entries = fresh.entries;
  state.value.plants = fresh.plants;
  persist();
  flash(`已为「${current.value.name}」恢复初始示例花园`);
}

const panelOpen = ref(false);
const newProfileName = ref('');
const confirmDeleteId = ref<string | null>(null);
let confirmTimer: number | undefined;

function openPanel() { panelOpen.value = true; newProfileName.value = ''; }
function closePanel() { panelOpen.value = false; confirmDeleteId.value = null; window.clearTimeout(confirmTimer); }
function onProfileSelect(event: Event) {
  switchProfile(book, (event.target as HTMLSelectElement).value);
  repo.save(book);
  flash(`已切换到「${current.value.name}」`);
}
function useProfile(id: string) {
  switchProfile(book, id);
  repo.save(book);
  panelOpen.value = false;
  flash(`已切换到「${current.value.name}」`);
}
function createProfileAndSwitch() {
  const { profile } = addProfile(book, newProfileName.value);
  newProfileName.value = '';
  repo.save(book);
  panelOpen.value = false;
  tab.value = '花园';
  flash(`新档案「${profile.name}」已创建，正在这片新土壤上记录`);
}
function createdLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('zh-CN');
}
function requestDelete(id: string) {
  if (book.profiles.length <= 1) return;
  if (confirmDeleteId.value !== id) {
    confirmDeleteId.value = id;
    window.clearTimeout(confirmTimer);
    confirmTimer = window.setTimeout(() => { confirmDeleteId.value = null; }, 3000);
    return;
  }
  const target = book.profiles.find((profile) => profile.id === id);
  const wasCurrent = id === book.currentId;
  removeProfile(book, id);
  confirmDeleteId.value = null;
  window.clearTimeout(confirmTimer);
  repo.save(book);
  flash(wasCurrent ? `已删除「${target?.name ?? ''}」，自动切换到「${current.value.name}」` : `已删除档案「${target?.name ?? ''}」`);
}
</script>

<template>
  <div class="garden-app">
    <header class="garden-topbar"><div class="garden-brand"><span class="garden-mark">✿</span><div><span class="eyebrow">THE INNER GARDEN / 02</span><h1>情绪植物园</h1></div></div><div class="garden-top-actions"><label class="profile-switch"><span>❋</span><select :value="book.currentId" @change="onProfileSelect"><option v-for="profile in book.profiles" :key="profile.id" :value="profile.id">{{ profile.name }} · {{ profile.garden.entries.length }} 条记录</option></select></label><button class="quiet-button" type="button" @click="openPanel">管理档案</button><span class="weather">今日花园 · {{ living.length }} 株在生长</span><button class="quiet-button" type="button" @click="reset">重置演示</button></div></header>
    <main class="garden-wrap"><section class="garden-hero"><div><span class="eyebrow green-text">DAILY EMOTION CULTIVATION · {{ current.name }}</span><h2>给情绪一块<br /><i>可以生长的土壤。</i></h2><p>你不需要每天都阳光明媚，只需要为此刻诚实地浇一次水。</p></div><div class="garden-stats"><div><strong>{{ report.active }}</strong><span>活跃日</span></div><div><strong>{{ report.lushness }}<small>%</small></strong><span>花园繁茂度</span></div><div><strong>{{ state.entries.length }}</strong><span>情绪标本</span></div></div></section>
      <nav class="garden-tabs"><button v-for="item in ['花园', '种植', '时间轴', '标本馆', '年报']" :key="item" type="button" :class="{ active: tab === item }" @click="tab = item as typeof tab">{{ item }}</button></nav>
      <section v-if="tab === '花园'" class="garden-board"><div class="board-heading"><div><span class="eyebrow">YOUR EMOTIONAL BIOME · {{ current.name }}</span><h3>正在生长的情绪</h3></div><span class="season-label">秋季 · 第 40 周</span></div><p v-if="!living.length" class="empty-state garden-empty">这片档案还没有正在生长的植物，去种下第一颗情绪吧。</p><div class="plant-grid"><article v-for="plant in living" :key="plant.id" class="plant-card" :style="{ '--plant-color': EMOTION_META[plant.emotion].color }"><div class="plant-card-top"><span class="plant-status">正在生长</span><span>{{ plant.streak }} 天连续</span></div><div class="plant-illustration"><span class="plant-glow"></span><strong>{{ EMOTION_META[plant.emotion].symbol }}</strong><i v-for="n in Math.min(plant.streak + 1, 5)" :key="n" :style="{ '--n': n }">●</i></div><div class="plant-info"><span class="plant-emotion">{{ plant.emotion }}</span><h4>{{ EMOTION_META[plant.emotion].plant }}</h4><p>{{ EMOTION_META[plant.emotion].hint }}</p><div class="growth-track"><span :style="{ width: `${Math.min(100, Math.max(12, plant.streak / 14 * 100))}%` }"></span></div><small>{{ plant.stage }} · 下一阶段还需 {{ Math.max(0, 3 - plant.streak) }} 天</small></div></article><button class="add-plant-card" type="button" @click="tab = '种植'"><span>＋</span><strong>种下一颗新情绪</strong><small>每天记录，植物就会长大</small></button></div></section>
      <section v-else-if="tab === '种植'" class="planting-layout"><article class="plant-form"><div class="board-heading"><div><span class="eyebrow">PLANT A FEELING · {{ current.name }}</span><h3>今天的你，是什么天气？</h3></div></div><div class="emotion-picker"><button v-for="emotion in EMOTIONS" :key="emotion" type="button" :class="{ selected: selectedEmotion === emotion }" :style="{ '--emotion-color': EMOTION_META[emotion].color }" @click="selectedEmotion = emotion"><span>{{ EMOTION_META[emotion].symbol }}</span><b>{{ emotion }}</b><small>{{ EMOTION_META[emotion].plant }}</small></button></div><label>给这颗情绪留一句话<textarea v-model="draft.note" rows="5" placeholder="它今天为什么来到这里？"></textarea></label><label>情绪强度 <output>{{ draft.intensity }} / 5</output><input v-model.number="draft.intensity" type="range" min="1" max="5" /></label><button class="plant-button" type="button" @click="plant">种下这颗情绪 ✦</button><p class="notice">新记录只保存到当前档案「{{ current.name }}」</p></article><aside class="plant-preview" :style="{ '--preview-color': EMOTION_META[selectedEmotion].color }"><span class="eyebrow">PREVIEW / {{ selectedEmotion }}</span><div class="preview-plant">{{ EMOTION_META[selectedEmotion].symbol }}</div><h3>{{ EMOTION_META[selectedEmotion].plant }}</h3><p>今天种下，连续记录 3 天后发芽，7 天后开花，14 天后结果。</p></aside></section>
      <section v-else-if="tab === '时间轴'" class="timeline-section"><div class="board-heading"><div><span class="eyebrow">GROWTH TIMELINE · {{ current.name }}</span><h3>每一天，都留下了一片叶子</h3></div></div><div v-if="timeline.length" class="timeline"><div v-for="(entry, index) in timeline" :key="entry.id" class="timeline-item"><div class="timeline-date"><strong>{{ new Date(`${entry.date}T00:00:00`).getDate() }}</strong><span>{{ new Date(`${entry.date}T00:00:00`).toLocaleDateString('zh-CN', { month: 'short' }) }}</span></div><div class="timeline-dot" :style="{ background: EMOTION_META[entry.emotion].color }"></div><div class="timeline-content"><div><span class="timeline-emotion" :style="{ color: EMOTION_META[entry.emotion].color }">{{ EMOTION_META[entry.emotion].symbol }} {{ entry.emotion }}</span><span class="intensity">强度 {{ entry.intensity }}/5</span></div><p>{{ entry.note }}</p><small>{{ EMOTION_META[entry.emotion].plant }} · 第 {{ index + 1 }} 片叶子</small></div></div></div><div v-else class="empty-state">「{{ current.name }}」还没有任何记录，时间轴等第一片叶子落下。</div></section>
      <section v-else-if="tab === '标本馆'" class="specimen-section"><div class="board-heading"><div><span class="eyebrow">SPECIMEN ARCHIVE · {{ current.name }}</span><h3>枯萎不是消失，是被好好保存</h3></div></div><div v-if="specimens.length" class="specimen-grid"><div v-for="plant in specimens" :key="plant.id" class="specimen-card"><div class="pressed-flower">{{ EMOTION_META[plant.emotion].symbol }}</div><div><span>{{ plant.emotion }} · {{ EMOTION_META[plant.emotion].plant }}</span><strong>生长了 {{ plant.entryIds.length }} 天</strong><small>最后浇水：{{ plant.lastWatered }}</small></div></div></div><div v-else class="empty-state">「{{ current.name }}」的标本馆还是空的。持续记录，等一朵花完成它的季节。</div></section>
      <section v-else class="report-section"><div class="report-heading"><span class="eyebrow">EMOTIONAL ECOLOGY REPORT · 2026 · {{ current.name }}</span><h3>你的情绪生态年报</h3><p>这一年，你和自己的内在天气相处得怎么样？</p></div><div class="report-grid"><div class="report-score"><span>花园繁茂度</span><strong>{{ report.lushness }}<small>/ 100</small></strong><div class="report-progress"><i :style="{ width: `${report.lushness}%` }"></i></div><p>每一次诚实的记录，都会让生态系统更完整。</p></div><div class="top-emotion"><span>最常出现的物种</span><div><strong :style="{ color: EMOTION_META[report.top.emotion].color }">{{ EMOTION_META[report.top.emotion].symbol }}</strong><h4>{{ report.top.emotion }}</h4></div><p>{{ report.top.count }} 次记录 · 是你今年最熟悉的一种天气</p></div><div class="count-chart"><span>情绪物种分布</span><div v-for="item in report.counts" :key="item.emotion" class="count-row"><b>{{ item.emotion }}</b><div><i :style="{ width: `${Math.max(5, item.count / Math.max(report.top.count, 1) * 100)}%`, background: EMOTION_META[item.emotion].color }"></i></div><small>{{ item.count }}</small></div></div></div></section>
    </main>
    <div v-if="panelOpen" class="profile-overlay" @click.self="closePanel">
      <div class="profile-dialog" role="dialog" aria-modal="true" aria-label="花园档案管理">
        <div class="profile-dialog-head"><div><span class="eyebrow">GARDEN PROFILES</span><h3>打理不同阶段的花园</h3></div><button class="profile-close" type="button" @click="closePanel">×</button></div>
        <p class="profile-tip">每个档案的记录、植物、连续天数与年报彼此独立；新增记录只会落到当前档案。</p>
        <div class="profile-list">
          <div v-for="profile in book.profiles" :key="profile.id" class="profile-row" :class="{ current: profile.id === book.currentId }">
            <div class="profile-row-main"><span class="profile-row-symbol">❋</span><div><strong>{{ profile.name }}</strong><small v-if="profile.id === book.currentId" class="profile-current-tag">当前档案</small><small>{{ profile.garden.entries.length }} 条记录 · 创建于 {{ createdLabel(profile.createdAt) }}</small></div></div>
            <div class="profile-row-actions"><button class="profile-use" type="button" :disabled="profile.id === book.currentId" @click="useProfile(profile.id)">{{ profile.id === book.currentId ? '使用中' : '切换' }}</button><button class="profile-delete" type="button" :disabled="book.profiles.length <= 1" @click="requestDelete(profile.id)">{{ confirmDeleteId === profile.id ? '再点一次确认' : '删除' }}</button></div>
          </div>
        </div>
        <form class="profile-create" @submit.prevent="createProfileAndSwitch"><input v-model="newProfileName" type="text" maxlength="20" placeholder="给新花园起个名字，如：职场侧的花园" /><button class="plant-button" type="submit" :disabled="!newProfileName.trim()">创建并切换到新档案</button></form>
        <p class="profile-footnote">删除当前档案会先自动切到另一个档案；至少保留一个档案，任何时候都有可用的花园。</p>
      </div>
    </div>
    <transition name="toast"><p v-if="notice" class="notice-toast">{{ notice }}</p></transition>
  </div>
</template>
